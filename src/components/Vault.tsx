import React, { useState } from "react";
import "../styles/Vault.scss";
import { ICommitteeMember, ISeverity, IVault } from "../types/types";
import { useSelector } from "react-redux";
import millify from "millify";
import { fromWei, isProviderAndNetwork, linkToEtherscan, numberWithCommas, truncatedAddress } from "../utils";
import ArrowIcon from "../assets/icons/arrow.icon";
import ZoomIcon from "../assets/icons/zoom.icon";
import TwitterImageIcon from "../assets/icons/twitterImage.icon";
import { RootState } from "../reducers";
import Modal from "./Shared/Modal";
import CopyToClipboard from "./Shared/CopyToClipboard";
import NFTPrize from "./NFTPrize";
import { NETWORK } from "../settings";
import { IPFS_PREFIX, RC_TOOLTIP_OVERLAY_INNER_STYLE } from "../constants/constants";
import Tooltip from "rc-tooltip";
import InfoIcon from "../assets/icons/info.icon";

interface IProps {
  data: IVault,
  setShowModal: (show: boolean) => any,
  setModalData: (data: any) => any
}

interface IContractsCoveredProps {
  contracts: Array<string>
}

const ContractsCovered = (props: IContractsCoveredProps) => {
  return (
    <>
      {props.contracts.map((contract: string, index: number) => {
        const contractName = Object.keys(contract)[0];
        return (
          <a key={index} target="_blank" rel="noopener noreferrer" className="contract-wrapper" href={linkToEtherscan(contract[contractName], NETWORK)}>
            <span className="contract-name">{contractName}</span>
            <span>{truncatedAddress(contract[contractName])}</span>
          </a>
        )
      })}
    </>
  )
}

export default function Vault(props: IProps) {
  const [toggleRow, setToggleRow] = useState(false);
  const provider = useSelector((state: RootState) => state.web3Reducer.provider);
  const { name, totalStaking, numberOfApprovedClaims, apy, totalRewardAmount, rewardsLevels, tokenPrice, honeyPotBalance } = props.data;
  const [showNFTModal, setShowNFTModal] = useState(false);
  const [modalNFTData, setModalNFTData] = useState(null);
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [modalContractsData, setModalContractsData] = useState(null);
  // <td className="sub-cell" colSpan={7}>{`Vulnerabilities Submitted: ${numberWithCommas(Number(master.numberOfSubmittedClaims))}`}</td>

  const description = JSON.parse(props.data.description as any);

  const members = description?.committee.members.map((member: ICommitteeMember, index: number) => {
    return (
      <a className="member-link-wrapper" key={index} href={member["twitter-link"]} target="_blank" rel="noreferrer">
        {member["image-ipfs-link"] ? <img src={`${IPFS_PREFIX}${member["image-ipfs-link"]}`} alt="twitter avatar" className="twitter-avatar" /> : <TwitterImageIcon />}
        <span className="member-username">{member.name}</span>
      </a>
    )
  })

  const severities = React.useCallback(description?.severities.map((severity: ISeverity, index: number) => {
    let rewardPrice = "-";
    const rewardPercentage = (Number(rewardsLevels[severity.index]) / 10000) * 100;
    if (tokenPrice) {
      rewardPrice = millify(Number(fromWei(honeyPotBalance)) * rewardPercentage * tokenPrice);
    }

    return (
      <div className="severity-wrapper" key={index}>
        <div className={`severity-title ${severity.name.toLocaleLowerCase()}`}>{severity.name.toUpperCase()}</div>
        <div className="severity-data">
          <div className="severity-data-item">
            <span className="vault-expanded-subtitle">Contracts Covered:</span>
            <ContractsCovered contracts={severity["contracts-covered"]} />
            <span className="view-all" onClick={() => { setModalContractsData(severity["contracts-covered"] as any); setShowContractsModal(true); }}>View all</span>
          </div>
          <div className="severity-data-item">
            <span className="vault-expanded-subtitle">Prize:</span>
            <span className="vault-prize">
              <b style={{ color: "white" }}>{`${rewardPercentage}%`}</b>
              <span style={{ color: "white" }}>&nbsp;of Vault
              <Tooltip
                  overlay="???"
                  overlayClassName="tooltip"
                  overlayInnerStyle={RC_TOOLTIP_OVERLAY_INNER_STYLE}
                  placement="top">
                  <span><InfoIcon width="10" /></span>
                </Tooltip>
              </span> &#8776; {`$${rewardPrice}`}
            </span>
          </div>
          {severity["nft-metadata"] &&
            <div className="severity-data-item">
              <span className="vault-expanded-subtitle">NFT:</span>
              <div className="nft-image-wrapper" onClick={() => { setShowNFTModal(true); setModalNFTData(severity as any); }}>
                <div className="zoom-icon"><ZoomIcon /></div>
                <img
                  className="nft-image"
                  src={`${IPFS_PREFIX}${severity["nft-metadata"].image.substring(12)}`}
                  alt="NFt" />
              </div>
            </div>}
        </div>
      </div>
    )
  }), [tokenPrice])

  return (
    <>
      <tr className="inner-row">
        <td>
          <div className={toggleRow ? "arrow open" : "arrow"} onClick={() => setToggleRow(!toggleRow)}><ArrowIcon /></div>
        </td>
        <td>
          <div className="project-name-wrapper">
            <img src={description["Project-metadata"].icon} alt="project logo" />
            {name}
          </div>
        </td>
        <td>{millify(Number(fromWei(totalStaking)))}</td>
        <td>{numberWithCommas(Number(numberOfApprovedClaims))}</td>
        <td>{millify(Number(fromWei(totalRewardAmount)))}</td>
        <td>{!apy ? "-" : `${millify(apy)}%`}</td>
        <td>
          <button
            className="action-btn deposit-withdraw"
            onClick={() => { props.setShowModal(true); props.setModalData(props.data) }}
            disabled={!isProviderAndNetwork(provider)}>
            DEPOSIT / WITHDRAW
          </button>
        </td>
      </tr>
      {
        toggleRow &&
        <tr>
          <td className="sub-row" colSpan={7}>
            <div className="vault-expanded">
              <div className="committee-wrapper">
                <div className="sub-title">Committee</div>
                <div className="committee-content">
                  <div className="vault-expanded-subtitle">
                    Members:
                    <div className="twitter-avatars-wrapper">{members}</div>
                  </div>
                  <div className="multi-sig-wrapper">
                    <span className="vault-expanded-subtitle">Multi sig:</span>
                    <div className="multi-sig-address-wrapper">
                      <a target="_blank"
                        rel="noopener noreferrer"
                        href={linkToEtherscan(description?.committee["multisig-address"], NETWORK)}
                        className="multi-sig-address">
                        {truncatedAddress(description?.committee["multisig-address"])}
                      </a>
                      <CopyToClipboard value={description?.committee["multisig-address"]} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="severity-prizes-wrapper">
                <div className="sub-title">Severity prizes</div>
                <div className="severity-prizes-content">
                  {severities}
                </div>
              </div>
            </div>
          </td>
        </tr>
      }
      {
        showNFTModal &&
        <Modal title="NFT PRIZE" setShowModal={setShowNFTModal} maxWidth="600px" width="60%" height="fit-content">
          <NFTPrize data={modalNFTData as any} />
        </Modal>
      }
      {
        showContractsModal &&
        <Modal title="CONTRACTS COVERED" setShowModal={setShowContractsModal} height="fit-content">
          <div className="contracts-covered-modal-wrapper"><ContractsCovered contracts={modalContractsData as any} /></div>
        </Modal>
      }
    </>
  )
}
