import { useQuery } from "@apollo/client";
import { TransactionStatus, useContractFunction, useEthers } from "@usedapp/core";
import { HATVaultsNFTContract, NFTContractDataProxy, Transactions } from "constants/constants";
import { Bytes, Contract } from "ethers";
import { solidityKeccak256 } from "ethers/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AirdropMachineWallet, IStaker, NFTTokenInfo, TokenInfo } from "types/types";
import { ipfsTransformUri } from "utils";
import hatVaultNftAbi from "data/abis/HATVaultsNFT.json";
import { GET_STAKER } from "graphql/subgraph";
import moment from "moment";
import { usePrevious } from "./usePrevious";

const { MerkleTree } = require('merkletreejs');
const keccak256 = require("keccak256");

interface MerkleTreeChanged {
  merkleTreeIPFSRef: string;
  deadline: number;
  root: Bytes;
}

export interface INFTTokenData {
  lastMerkleTree?: MerkleTreeChanged;
  merkleTree?: AirdropMachineWallet[];
  isBeforeDeadline?: boolean;
  nftTokens?: NFTTokenInfo[];
  redeemTree: () => Promise<any>;
  redeemMultipleFromTreeState: TransactionStatus;
  redeemShares: () => Promise<any>;
  redeemMultipleFromSharesState: TransactionStatus;
  actualAddressInfo?: AirdropMachineWallet;
  actualAddress?: string;
  airdropToRedeem: boolean | undefined;
  depositToRedeem: boolean | undefined;
}

const DATA_REFRESH_TIME = 10000;

export function useNFTTokenData(): INFTTokenData {
  const { library, account, chainId } = useEthers();
  const [contract, setContract] = useState<Contract>();
  const { send: redeemMultipleFromTree, state: redeemMultipleFromTreeState } =
    useContractFunction(contract, "redeemMultipleFromTree", { transactionName: Transactions.RedeemTreeNFTs });
  const { send: redeemMultipleFromShares, state: redeemMultipleFromSharesState } = useContractFunction(
    contract, "redeemMultipleFromShares", { transactionName: Transactions.RedeemDepositNFTs });
  const [treeTokens, setTreeTokens] = useState<NFTTokenInfo[] | undefined>();
  const [proofTokens, setProofTokens] = useState<NFTTokenInfo[] | undefined>();
  const nftTokens = useMemo(() => [...(treeTokens || [] as NFTTokenInfo[]), ...(proofTokens || [])].reduce((prev, curr) => {
    const exists = prev.find(nft => nft.tokenId.eq(curr.tokenId));
    if (exists) {
      if (curr.isDeposit)
        exists.isDeposit = true;
      if (curr.isMerkleTree)
        exists.isMerkleTree = true;
    } else
      prev.push(curr);
    return prev;
  }, [] as NFTTokenInfo[]), [treeTokens, proofTokens]);
  const actualAddress = account;
  const prevActualAddress = usePrevious(actualAddress);
  const prevChainId = usePrevious(chainId);
  const [lastMerkleTree, setLastMerkleTree] = useState<MerkleTreeChanged>();
  const [merkleTree, setMerkleTree] = useState<AirdropMachineWallet[]>();
  const isBeforeDeadline = lastMerkleTree?.deadline ? moment().unix() < Number(lastMerkleTree.deadline) : undefined;
  const actualAddressInfo = merkleTree?.find(wallet => wallet.address.toLowerCase() === actualAddress?.toLowerCase());

  const airdropToRedeem = useMemo(() => nftTokens.filter(nft => nft.isMerkleTree).some(nft => !nft.isRedeemed), [nftTokens]);
  const depositToRedeem = useMemo(() => nftTokens.filter(nft => nft.isDeposit)?.some(nft => !nft.isRedeemed), [nftTokens]);

  useEffect(() => {
    if (actualAddress !== prevActualAddress || chainId !== prevChainId) {
      setTreeTokens(undefined);
      setProofTokens(undefined);
    }
  }, [actualAddress, prevActualAddress, chainId, prevChainId]);

  useEffect(() => {
    if (chainId)
      setContract(new Contract(HATVaultsNFTContract[chainId], hatVaultNftAbi, library));
  }, [library, chainId])

  const { data: stakerData } = useQuery<{ stakers: IStaker[] }>(
    GET_STAKER, {
    variables: { address: actualAddress },
    context: { chainId },
    pollInterval: DATA_REFRESH_TIME,
    fetchPolicy: "no-cache",
  })

  const prevStakerData = usePrevious(stakerData);

  const pidsWithAddress = stakerData?.stakers.map(staker => ({ pid: staker?.pid, masterAddress: staker?.master.address }));

  const getEligibilityForPids = useCallback(async () => {
    if (!pidsWithAddress || !contract) return;
    const eligibilitiesPerPid = await Promise.all(pidsWithAddress.map(async pidWithAddress => {
      const { pid, masterAddress } = pidWithAddress;
      const proxyAddress = NFTContractDataProxy[masterAddress.toLowerCase()];
      const isEligibile = await contract.isEligible(proxyAddress, pid, actualAddress);
      if (!isEligibile) return [];
      const tiers = await contract.getTierFromShares(proxyAddress, pid, actualAddress);
      const tokens: NFTTokenInfo[] = [];
      for (let tier = 1; tier <= tiers; tier++) {
        const tokenId = await contract.getTokenId(proxyAddress, pid, tier);
        const isRedeemed = await contract.tokensRedeemed(tokenId, actualAddress) as boolean;
        const tokenUri = await contract.uri(tokenId);
        const nftInfo = await (await fetch(ipfsTransformUri(tokenUri))).json() as TokenInfo;
        tokens.push({ ...pidWithAddress, tier, isRedeemed, tokenId, nftInfo, isDeposit: true, isMerkleTree: false });
      }
      return tokens;
    }))

    const eligibilityPerPid = eligibilitiesPerPid.flat();
    setProofTokens(eligibilityPerPid);
  }, [contract, actualAddress, pidsWithAddress])


  useEffect(() => {
    if (stakerData && prevStakerData !== stakerData && pidsWithAddress?.length) {
      getEligibilityForPids();
    }

  }, [pidsWithAddress, prevStakerData, stakerData, getEligibilityForPids])

  const getTreeEligibility = useCallback(async () => {
    if (!contract || !actualAddressInfo) return;
    const treeNfts = await Promise.all(actualAddressInfo.nft_elegebility.map(async (nft) => {
      const { pid, tier: tiers, masterAddress } = nft;
      const proxyAddress = NFTContractDataProxy[masterAddress.toLowerCase()];
      const tokens: NFTTokenInfo[] = [];
      for (let tier = 1; tier <= tiers; tier++) {
        const tokenId = await contract.getTokenId(proxyAddress, pid, tier);
        const isRedeemed = await contract.tokensRedeemed(tokenId, actualAddress) as boolean;
        const tokenUri = await contract.uri(tokenId);
        const nftInfo = await (await fetch(ipfsTransformUri(tokenUri))).json() as TokenInfo;
        tokens.push({ ...nft, isRedeemed, tokenId, nftInfo, isMerkleTree: true, isDeposit: false });
      }
      return tokens;
    }));
    setTreeTokens(treeNfts.flat());
  }, [contract, actualAddress, actualAddressInfo])

  const getMerkleTree = useCallback(async () => {
    const data = contract?.filters.MerkleTreeChanged();
    if (!data) {
      return;
    }
    const filter = await contract?.queryFilter(data, 0);
    if (filter) {
      const lastElement = filter[filter.length - 1] as any | undefined;
      const args = lastElement.args as MerkleTreeChanged;
      const response = await fetch(ipfsTransformUri(args.merkleTreeIPFSRef));
      const ipfsContent = await response.json();
      const tree: AirdropMachineWallet[] = [];

      for (const wallet in ipfsContent) {
        tree.push({ address: wallet, ...ipfsContent[wallet] })
      }

      setMerkleTree(tree);
      setLastMerkleTree(args);
    }
  }, [contract])

  useEffect(() => {
    if (contract)
      getMerkleTree();
  }, [getMerkleTree, contract])

  useEffect(() => {
    if (actualAddressInfo)
      getTreeEligibility();
  }, [actualAddressInfo, getTreeEligibility]);

  const buildProofsForRedeemables = useCallback(() => {
    if (!merkleTree) {
      return;
    }
    /**
    * The tree is built from ALL the data (including the redeemed NFTs)
    */
    const builtMerkleTree = buildMerkleTree(merkleTree);

    /**
     * Build the proofs only for the non-redeemed NFTs.
     */
    return nftTokens.filter(nft => nft.isMerkleTree && !nft.isRedeemed)?.map(nft => {
      return builtMerkleTree.getHexProof(hashToken(NFTContractDataProxy[nft.masterAddress.toLowerCase()], nft.pid, actualAddress!, nft.tier))
    })
  }, [nftTokens, merkleTree, actualAddress]);

  const redeemTree = useCallback(async () => {
    if (!nftTokens) return;
    const redeemableProofs = buildProofsForRedeemables();
    const redeemable = nftTokens.filter(nft => nft.isMerkleTree && !nft.isRedeemed);
    const hatVaults = redeemable.map(nft => NFTContractDataProxy[nft.masterAddress.toLowerCase()]);
    const pids = redeemable.map(nft => nft.pid);
    const tiers = redeemable.map(nft => nft.tier);
    await redeemMultipleFromTree(hatVaults, pids, actualAddress, tiers, redeemableProofs);
  }, [nftTokens, actualAddress, buildProofsForRedeemables, redeemMultipleFromTree]);

  const prevRedeemMultipleFromTreeStateStatus = usePrevious(redeemMultipleFromTreeState.status);
  useEffect(() => {
    if (prevRedeemMultipleFromTreeStateStatus !== redeemMultipleFromTreeState.status && redeemMultipleFromTreeState.status === "Success") {
      getTreeEligibility();
    }
  }, [prevRedeemMultipleFromTreeStateStatus, redeemMultipleFromTreeState.status, getTreeEligibility])

  const prevRedeemMultipleFromSharesStateStatus = usePrevious(redeemMultipleFromSharesState.status);
  useEffect(() => {
    if (prevRedeemMultipleFromSharesStateStatus !== redeemMultipleFromSharesState.status && redeemMultipleFromSharesState.status === "Success") {
      getEligibilityForPids();
    }
  }, [prevRedeemMultipleFromSharesStateStatus, redeemMultipleFromSharesState.status, getEligibilityForPids])

  const redeemShares = useCallback(async () => {
    const depositRedeemables = nftTokens.filter(nft => nft.isDeposit);
    const hatVaults = depositRedeemables.map(nft => NFTContractDataProxy[nft.masterAddress.toLowerCase()]);
    const pids = depositRedeemables.map(nft => nft.pid);
    await redeemMultipleFromShares(hatVaults, pids, actualAddress);
  }, [redeemMultipleFromShares, actualAddress, nftTokens])

  return {
    lastMerkleTree,
    merkleTree,
    isBeforeDeadline,
    nftTokens,
    redeemTree,
    redeemMultipleFromTreeState,
    redeemShares,
    redeemMultipleFromSharesState,
    actualAddressInfo,
    actualAddress,
    airdropToRedeem,
    depositToRedeem,
  };
};


const buildMerkleTree = (data: AirdropMachineWallet[]) => {
  const hashes: Buffer[] = [];
  data.forEach(wallet => {
    wallet.nft_elegebility.forEach(nft => {
      hashes.push(hashToken(NFTContractDataProxy[nft.masterAddress.toLowerCase()], nft.pid, wallet.address, nft.tier));
    })
  })

  return new MerkleTree(hashes, keccak256, { sortPairs: true });
}

const hashToken = (hatVaults: string, pid: number, account: string, tier: number) => {
  return Buffer.from(solidityKeccak256(['address', 'uint256', 'address', 'uint8'], [hatVaults, pid, account, tier]).slice(2), 'hex');
}
