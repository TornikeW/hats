import { HATVaultsNFT_abi, ChainsConfig } from "@hats-finance/shared";
import { writeContract } from "wagmi/actions";
import { NFTContractDataProxy } from "constants/constants";
import { buildMerkleTree, hashToken } from "./utils";
import { AirdropMachineWallet } from "./types";

export async function redeemAirdrop(chainId: number, airdropTree: AirdropMachineWallet[], address: string) {
  const merkleTree = buildMerkleTree(airdropTree);
  const addressInfo = airdropTree.find((wallet) => wallet.address.toLowerCase() === address.toLowerCase());
  if (!addressInfo) return;
  const redeemableProofs = addressInfo.nft_elegebility.map((nft) =>
    merkleTree.getHexProof(hashToken(NFTContractDataProxy[nft.masterAddress.toLowerCase()], Number(nft.pid), address, nft.tier))
  );
  const hatVaults = addressInfo.nft_elegebility.map((nft) => NFTContractDataProxy[nft.masterAddress.toLowerCase()]);
  const pids = addressInfo.nft_elegebility.map((nft) => nft.pid);
  const tiers = addressInfo.nft_elegebility.map((nft) => nft.tier);

  const vaultsNFTContract = ChainsConfig[chainId].vaultsNFTContract;
  if (!vaultsNFTContract) return null;

  const response = await writeContract({
    mode: "recklesslyUnprepared",
    address: vaultsNFTContract as `0x${string}`,
    abi: HATVaultsNFT_abi as any,
    functionName: "redeemMultipleFromTree",
    args: [hatVaults, pids, tiers, redeemableProofs],
  });
  return response.wait();
}
