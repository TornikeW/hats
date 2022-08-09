import { useQuery } from "@apollo/client";
import { TransactionStatus, useContractFunction, useEthers } from "@usedapp/core";
import { HATVaultsNFTContract, NFTContractDataProxy } from "constants/constants";
import { BigNumber, Bytes, Contract } from "ethers";
import { keccak256, solidityKeccak256 } from "ethers/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AirdropMachineWallet, IStaker, NFTTokenInfo, TokenInfo } from "types/types";
import { ipfsTransformUri } from "utils";
import hatVaultNftAbi from "data/abis/HATVaultsNFT.json";
import { GET_STAKER } from "graphql/subgraph";
import moment from "moment";
import { usePrevious } from "./usePrevious";

const { MerkleTree } = require('merkletreejs');

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
  airdropToRedeem: boolean;
  depositToRedeem: boolean;
}

const DATA_REFRESH_TIME = 10000;

export function useNFTTokenData(address?: string): INFTTokenData {
  const { library, account, chainId } = useEthers();
  const [contract, setContract] = useState<Contract>();
  const { send: redeemMultipleFromTree, state: redeemMultipleFromTreeState } =
    useContractFunction(contract, "redeemMultipleFromTree", { transactionName: "Redeem NFTs" });
  const { send: redeemMultipleFromShares, state: redeemMultipleFromSharesState } = useContractFunction(
    contract, "redeemMultipleFromShares", { transactionName: "Redeem NFTs" });
  const [treeTokens, setTreeTokens] = useState<NFTTokenInfo[] | undefined>();
  const [proofTokens, setProofTokens] = useState<NFTTokenInfo[] | undefined>();
  const nftTokens = useMemo(() => [...(treeTokens || []), ...(proofTokens || [])], [treeTokens, proofTokens]);
  const actualAddress = address ?? account;
  const prevActualAddress = usePrevious(actualAddress);
  const [lastMerkleTree, setLastMerkleTree] = useState<MerkleTreeChanged>();
  const [merkleTree, setMerkleTree] = useState<AirdropMachineWallet[]>();
  const isBeforeDeadline = lastMerkleTree?.deadline ? moment().unix() < Number(lastMerkleTree.deadline) : undefined;

  const actualAddressInfo = merkleTree?.find(wallet => wallet.address.toLowerCase() === actualAddress?.toLowerCase());

  const airdropToRedeem = nftTokens?.filter(nft => nft.type === "MerkleTree")?.some(nft => !nft.isRedeemed);
  const depositToRedeem = nftTokens?.filter(nft => nft.type === "Deposit")?.some(nft => !nft.isRedeemed);

  useEffect(() => {
    if (actualAddress !== prevActualAddress) {
      setTreeTokens(undefined);
      setProofTokens(undefined);
    }
  }, [actualAddress, prevActualAddress]);

  useEffect(() => {
    if (chainId)
      setContract(new Contract(HATVaultsNFTContract[chainId], hatVaultNftAbi, library));
  }, [library, chainId])

  const { data: stakerData } = useQuery<{ stakers: IStaker[] }>(
    GET_STAKER, {
    variables: { address: actualAddress },
    context: { chainId },
    pollInterval: DATA_REFRESH_TIME
  })

  const pidsWithAddress = stakerData?.stakers.map(staker => ({ pid: staker?.pid, masterAddress: staker?.master.address }));

  const getEligibilityForPids = useCallback(async () => {
    if (!pidsWithAddress || !contract || pidsWithAddress.length === 0 || proofTokens) return;
    const eligibilitiesPerPid = await Promise.all(pidsWithAddress.map(async pidWithAddress => {
      const { pid, masterAddress } = pidWithAddress;
      const proxyAddress = NFTContractDataProxy[masterAddress.toLowerCase()];
      const isEligibile = await contract.isEligible(proxyAddress, pid, actualAddress);
      const tiers = await contract.getTierFromShares(proxyAddress, pid, actualAddress);
      const tokens: NFTTokenInfo[] = [];
      for (let tier = 1; tier <= tiers; tier++) {
        /** adding +1 because the indexes in the IPFS start in 1 (not 0) */
        const tokenId = await contract.getTokenId(proxyAddress, pid, tier);// as BigNumber).add(1).toNumber();
        const isRedeemed = await contract.tokensRedeemed(tokenId, actualAddress) as boolean;
        const tokenUri = await contract.uri(tokenId);
        const nftInfo = await (await fetch(ipfsTransformUri(tokenUri))).json() as TokenInfo;
        tokens.push({ ...pidWithAddress, tier, isEligibile, isRedeemed, tokenId, nftInfo, type: "Deposit" });
      }
      return tokens;
    }))

    const eligibilityPerPid = eligibilitiesPerPid.flat();
    setProofTokens(eligibilityPerPid);
  }, [contract, actualAddress, pidsWithAddress, proofTokens])

  useEffect(() => {
    getEligibilityForPids();
  }, [getEligibilityForPids])

  const getTreeEligibility = useCallback(async () => {
    if (!contract || !actualAddressInfo || treeTokens) return;

    const treeNfts = await Promise.all(actualAddressInfo.nft_elegebility.map(async (nft): Promise<NFTTokenInfo> => {
      const { pid, tier, masterAddress } = nft;
      const proxyAddress = NFTContractDataProxy[masterAddress.toLowerCase()];
      const tokenId = await contract.getTokenId(proxyAddress, pid, tier);
      const isRedeemed = await contract.tokensRedeemed(proxyAddress, pid, tier, actualAddress) as boolean;
      const tokenUri = await contract.uri(tokenId);
      const nftInfo = await (await fetch(ipfsTransformUri(tokenUri))).json() as TokenInfo;
      return { ...nft, isRedeemed, tokenId, nftInfo, isEligibile: true, type: "MerkleTree" };
    }));

    setTreeTokens(treeNfts);
  }, [contract, actualAddress, treeTokens, actualAddressInfo])

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
      setMerkleTree(ipfsContent.wallets);
      setLastMerkleTree(args);
    }
  }, [contract])

  useEffect(() => {
    if (contract)
      getMerkleTree();
  }, [getMerkleTree, contract])

  useEffect(() => {
    getTreeEligibility();
  }, [getTreeEligibility]);

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
    const proofs = nftTokens.filter(nft => nft.type === "MerkleTree" && !nft.isRedeemed)?.map(nft => {
      return builtMerkleTree.getHexProof(hashToken(NFTContractDataProxy[nft.masterAddress.toLowerCase()], nft.pid, actualAddress!, nft.tier));
    })
    return proofs;
  }, [nftTokens, merkleTree, actualAddress]);

  const redeemTree = useCallback(async () => {
    if (!nftTokens) return;
    const redeemableProofs = buildProofsForRedeemables();
    const redeemable = nftTokens.filter(nft => nft.type === "MerkleTree" && !nft.isRedeemed);
    const hatVaults = redeemable.map(nft => NFTContractDataProxy[nft.masterAddress.toLowerCase()]);
    const pids = redeemable.map(nft => nft.pid);
    const tiers = redeemable.map(nft => nft.tier);
    await redeemMultipleFromTree(hatVaults, pids, actualAddress, tiers, redeemableProofs);
  }, [nftTokens, actualAddress, buildProofsForRedeemables, redeemMultipleFromTree]);

  useEffect(() => {
    if (redeemMultipleFromTreeState.status === "Success") {
      /** TODO: need to update the nftData?.airdropToRedeem? */
      getTreeEligibility();
    }
  }, [redeemMultipleFromTreeState, getTreeEligibility])

  const redeemShares = useCallback(async () => {
    const depositRedeemables = nftTokens.filter(nft => nft.type === "Deposit" && nft.isEligibile);
    const hatVaults = depositRedeemables.map(nft => NFTContractDataProxy[nft.masterAddress.toLowerCase()]);
    const pids = depositRedeemables.map(nft => nft.pid);
    await redeemMultipleFromShares(hatVaults, pids, actualAddress);
  }, [redeemMultipleFromShares, actualAddress, nftTokens])

  useEffect(() => {
    if (redeemMultipleFromSharesState.status === "Success") {
      /** TODO: need to update the nftData?.depositToRedeem? */
      getEligibilityForPids();
    }
  }, [redeemMultipleFromSharesState, getEligibilityForPids])

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
    depositToRedeem
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