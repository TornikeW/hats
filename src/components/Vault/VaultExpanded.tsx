import { IPoolWithdrawRequest, IVault, IVaultDescription } from "../../types/types";
import { setVulnerabilityProject } from "../../utils";
import Members from "./Members";
import Multisig from "./Multisig";
import Severities from "./Severities/Severities";
import { PieChartColors, ScreenSize } from "../../constants/constants";
import { PieChart } from "react-minimal-pie-chart";
import { useState } from "react";
import humanizeDuration from "humanize-duration";
import { useSelector } from "react-redux";
import { RootState } from "../../reducers";
import VaultAction from "./VaultAction";
import { isMobile } from "web3modal";
import ArrowIcon from "../../assets/icons/arrow.icon";
import "./VaultExpanded.scss";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoutePaths } from "navigation";

interface IProps {
  data: IVault
  withdrawRequests?: IPoolWithdrawRequest[]
  preview?: boolean
}

export default function VaultExpanded(props: IProps) {
  const { t } = useTranslation();
  const { id, hackerVestedRewardSplit, hackerRewardSplit, committeeRewardSplit, swapAndBurnSplit,
    governanceHatRewardSplit, hackerHatRewardSplit, vestingDuration, stakingTokenSymbol,
    description } = props.data;
  const navigate = useNavigate()
  const screenSize = useSelector((state: RootState) => state.layoutReducer.screenSize);
  const isNormalVault = !description?.["project-metadata"].type || description?.["project-metadata"].type === '';

  const pieChartData = [
    { title: `Vested ${stakingTokenSymbol} for ${humanizeDuration(Number(vestingDuration) * 1000, { units: ["d", "h", "m"] })} (Hacker reward)`, value: Number(hackerVestedRewardSplit) / 100, color: PieChartColors.vestedToken },
    { title: `${stakingTokenSymbol} (Hacker reward)`, value: Number(hackerRewardSplit) / 100, color: PieChartColors.token },
    { title: 'Committee', value: Number(committeeRewardSplit) / 100, color: PieChartColors.committee },
    { title: `Vested Hats for ${humanizeDuration(Number(props.data.master.vestingHatDuration) * 1000, { units: ["d", "h", "m"] })} (Hacker reward) pending start of TGE`, value: Number(hackerHatRewardSplit) / 100, color: PieChartColors.vestedHats },
    { title: 'Governance', value: Number(governanceHatRewardSplit) / 100, color: PieChartColors.governance },
    { title: 'Swap and Burn', value: Number(swapAndBurnSplit) / 100, color: PieChartColors.swapAndBurn },
  ];

  const pieChartNonZeroVaules = pieChartData.filter((obj) => obj.value !== 0);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const [chartMouseOver, setChartMouseOver] = useState(false);

  const nextSegement = () => {
    if (selectedSegmentIndex + 1 === pieChartNonZeroVaules.length) {
      setSelectedSegmentIndex(0);
    } else {
      setSelectedSegmentIndex(selectedSegmentIndex + 1);
    }
  }

  const prevSegement = () => {
    if (selectedSegmentIndex - 1 === -1) {
      setSelectedSegmentIndex(pieChartNonZeroVaules.length - 1);
    } else {
      setSelectedSegmentIndex(selectedSegmentIndex - 1);
    }
  }

  return (
    <tr>
      <td className="sub-row" colSpan={7}>
        <div className="vault-expanded">
          {screenSize === ScreenSize.Mobile && (
            <div >
              <VaultAction {...props} />
            </div>
          )}
          <div className="vault-details-wrapper">
            <div className="sub-title">
              {t("Vault.vault-details")}
            </div>
            <div className="vault-details-content">
              <div>
                <span className="vault-expanded-subtitle">{t("Vault.committee-members")}:</span>
                <div className="twitter-avatars-wrapper">
                  <Members members={description!.committee.members} />
                </div>
                <div className="multi-sig-wrapper">
                  <span className="vault-expanded-subtitle">{t("Vault.committee-address")}:</span>
                  <Multisig multisigAddress={(description as IVaultDescription).committee["multisig-address"]} />
                </div>
                <div className="submit-vulnerability-button-wrapper">
                  <button onClick={() => { setVulnerabilityProject(description!["project-metadata"].name, id, props.data.master.address); navigate(RoutePaths.vulnerability); }} disabled={props.preview}>{t("Vault.submit-vulnerability")}</button>
                </div>
              </div>
              <div className="prize-division-wrapper">
                <span className="vault-expanded-subtitle">{t("Vault.prize-division")}:</span>
                <div className="pie-chart-wrapper">

                  <div className="pie-chart-container">
                    {isMobile() && <button style={{ transform: "rotate(180deg)" }} onClick={nextSegement}><ArrowIcon width="20" height="20" /></button>}
                    <PieChart
                      onMouseOver={(e, segmentIndex) => {
                        setChartMouseOver(true);
                        setSelectedSegmentIndex(segmentIndex);
                      }}
                      onMouseOut={() => setChartMouseOver(false)}
                      segmentsShift={(index) => (index === selectedSegmentIndex && (chartMouseOver || screenSize === ScreenSize.Mobile) ? 7 : 0)}
                      lineWidth={45}
                      data={pieChartNonZeroVaules} />
                    {isMobile() && <button onClick={prevSegement}><ArrowIcon width="20" height="20" /></button>}
                  </div>

                  <div className="label-wrapper" style={{ borderLeftColor: pieChartNonZeroVaules[selectedSegmentIndex].color }}>
                    <span className="value">{`${pieChartNonZeroVaules[selectedSegmentIndex].value}%`}</span>
                    <span>{pieChartNonZeroVaules[selectedSegmentIndex].title}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="severity-prizes-wrapper">
            <div className="sub-title">{isNormalVault ? t("Vault.severity-prizes") : t("Vault.prizes")}</div>
            <div className="severity-prizes-content">
              <Severities
                severities={(description as IVaultDescription)?.severities}
                vault={props.data} />
            </div>
          </div>
        </div>
      </td>
    </tr >
  )
}
