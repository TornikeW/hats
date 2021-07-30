export interface IVault {
  id: string
  pid: string
  stakingToken: string
  stakers: Array<IStaker>
  totalStaking: string
  totalReward: string
  totalRewardPaid: string
  committee: Array<string>
  allocPoint: string
  master: IMaster
  numberOfApprovedClaims: string
  approvedClaims: Array<IApprovedClaims>
  rewardsLevels: Array<string>
  rewardsSplit: Array<string>
  descriptionHash: string
  description: IVaultDescription | string
  apy: number
  totalRewardAmount: string
  liquidityPool: boolean
  tokenPrice: number
  honeyPotBalance: string
  registered: boolean
  withdrawRequests: Array<IPoolWithdrawRequest>
  stakingTokenDecimals: string
  totalUsersShares: string
  guests: Array<IGuestVault>
}

export interface IGuestVault {
  id: string
  pid: string
  name: string
  descriptionHash: string
  description: string
  bounty: string
  vault: IVault
}

export interface IVaultDescription {
  "Project-metadata": {
    icon: string
    website: string
    name: string
    tokenIcon: string
  }
  "communication-channel": {
    "committee-bot": string
    "pgp-pk": string
  }
  "committee": {
    "multisig-address": string
    "members": Array<ICommitteeMember>
  }
  "severities": Array<ISeverity>
}

export interface ICommitteeMember {
  "name": string
  "address": string
  "twitter-link": string
  "image-ipfs-link"?: string
}

export interface ISeverity {
  "name": string
  "index": number
  "contracts-covered": Array<string>
  "nft-metadata": INFTMetaData
  "reward-for": string
  "description": string
}

export interface INFTMetaData {
  name: string
  description: string
  animation_url: string
  image: string
  external_url: string
}

export interface IStaker {
  id: string
  pid: string
  createdAt: string
  address: string
  vault: IVault
  rewardPaid: string
  shares: string
  depositAmount: string
  withdrawAmount: string
}

export interface IMaster {
  id: string
  address: string
  governance: string
  totalStaking: string
  totalReward: string
  totalRewardPaid: string
  rewardPerBlock: string
  startBlock: string
  vaults: Array<IVault>
  totalAllocPoints: string
  createdAt: string
  rewardsToken: string
  numberOfSubmittedClaims: string
  submittedClaim: Array<ISubmittedClaim>
  withdrawPeriod: string
  safetyPeriod: string
  withdrawRequestEnablePeriod: string
  withdrawRequestPendingPeriod: string
}

export interface ISubmittedClaim {
  id: string
  claim: string
  claimer: string
  createdAt: string
  master: IMaster
}

export interface IApprovedClaims {
  id: string
  approver: string
  vault: IVault
  beneficiary: string
  sevirity: string
  hackerReward: string
  approverReward: string
  swapAndBurn: string
  hackerHatReward: string
  createdAt: string
}

export interface IPoolWithdrawRequest {
  id: string
  beneficiary: string
  vault: IVault
  withdrawEnableTime: string
  createdAt: string
  expiryTime: string
}

export interface IWithdrawSafetyPeriod {
  isSafetyPeriod: boolean
  timeLeftForSafety: number
}
