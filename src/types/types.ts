import { BigNumber } from "ethers";

export interface IVault {
  id: string;
  descriptionHash: string;
  description: IVaultDescription | undefined;
  pid: string;
  stakingToken: string;
  stakingTokenDecimals: string;
  stakingTokenSymbol: string;
  stakers: Array<IStaker>;
  totalStaking: string;
  honeyPotBalance: string;
  totalReward: string;
  totalRewardPaid: string;
  committee: string;
  allocPoint: string;
  master: IMaster;
  numberOfApprovedClaims: string;
  approvedClaims: Array<IApprovedClaims>;
  rewardsLevels: Array<string>;
  totalRewardAmount: string;
  liquidityPool: boolean;
  registered: boolean;
  withdrawRequests: Array<IPoolWithdrawRequest>;
  totalUsersShares: string;
  hackerVestedRewardSplit: string;
  hackerRewardSplit: string;
  committeeRewardSplit: string;
  swapAndBurnSplit: string;
  governanceHatRewardSplit: string;
  hackerHatRewardSplit: string;
  vestingDuration: string;
  vestingPeriods: string;
  depositPause: boolean;
  committeeCheckedIn: boolean;
  multipleVaults?: IVault[];
}

export interface IVaultDescription {
  "project-metadata": {
    icon: string;
    website: string;
    name: string;
    tokenIcon: string;
    type?: string;
    endtime?: number;
    starttime?: number;
  };
  "communication-channel": {
    "pgp-pk": string | string[];
  };
  committee: {
    "multisig-address": string;
    members: Array<ICommitteeMember>;
  };
  severities: Array<IVulnerabilitySeverity>;
  source: {
    name: string;
    url: string;
  };
  "additional-vaults"?: string[];
}

export interface ICommitteeMember {
  name: string;
  address: string;
  "twitter-link": string;
  "image-ipfs-link"?: string;
}

export interface IVulnerabilitySeverity {
  name: string;
  index: number;
  "contracts-covered": { [key: string]: string }[];
  "nft-metadata": INFTMetaData;
  //  "reward-for": string
  description: string;
}

export interface INFTMetaData {
  name: string;
  description: string;
  animation_url: string;
  image: string;
  external_url: string;
}

export interface IStaker {
  id: string;
  pid: string;
  createdAt: string;
  address: string;
  vault: IVault;
  rewardPaid: string;
  shares: string;
  depositAmount: string;
  master: IMaster;
}

export interface IMaster {
  id: string;
  address: string;
  governance: string;
  totalStaking: string;
  totalReward: string;
  totalRewardPaid: string;
  rewardPerBlock: string;
  startBlock: string;
  vaults: Array<IVault>;
  totalAllocPoints: string;
  createdAt: string;
  rewardsToken: string;
  numberOfSubmittedClaims: string;
  submittedClaim: Array<ISubmittedClaim>;
  withdrawPeriod: string;
  safetyPeriod: string;
  withdrawRequestEnablePeriod: string;
  withdrawRequestPendingPeriod: string;
  vestingHatDuration: string;
  vestingHatPeriods: string;
}

export interface ISubmittedClaim {
  id: string;
  claim: string;
  claimer: string;
  createdAt: string;
  master: IMaster;
}

export interface IApprovedClaims {
  id: string;
  approver: string;
  vault: IVault;
  beneficiary: string;
  sevirity: string;
  hackerReward: string;
  approverReward: string;
  swapAndBurn: string;
  hackerHatReward: string;
  createdAt: string;
}

export interface IPoolWithdrawRequest {
  id: string;
  beneficiary: string;
  vault: IVault;
  withdrawEnableTime: string;
  createdAt: string;
  expiryTime: string;
}

export interface IWithdrawSafetyPeriod {
  isSafetyPeriod: boolean;
  saftyStartsAt: number;
  saftyEndsAt: number;
}

export type NFTAirdropET = { [key: string]: string };
export type TokenAirdropET = { [key: string]: number };

export interface IAirdropData {
  nft: NFTAirdropET;
  token: TokenAirdropET;
}
export interface INFTAirdropElement {
  description: string;
  external_url: string;
  image: string;
  name: string;
  attributes: Array<any>;
}
export interface GeneralParameters {
  withdrawRequestEnablePeriod: number;
  withdrawPeriod: number;
  safetyPeriod: number;
}

export type CoinGeckoPriceResponse = { [token: string]: undefined | {} | { usd?: number } };

export type VaultApys = { [token: string]: { apy: number | undefined; tokenSymbol: string } };

export interface NFTEligibilityElement {
  pid: number | string;
  tier: number;
  masterAddress: string;
}

export interface AirdropMachineWallet {
  address: string;
  token_eligibility: {
    committee_member: string;
    depositor: string;
    crow: string;
    coder: string;
    early_contributor: string;
  };
  nft_elegebility: NFTEligibilityElement[];
}

export interface INFTTokenMetadata {
  name: string;
  description: string;
  image: string;
  animation_url: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

export interface INFTTokenInfo {
  pid: number;
  tier: number;
  tokenId: BigNumber;
  metadata: INFTTokenMetadata;
  masterAddress: string;
  isMerkleTree: boolean;
  isDeposit: boolean;
}

export interface INFTTokenInfoRedeemed extends INFTTokenInfo {
  isRedeemed: boolean;
}
