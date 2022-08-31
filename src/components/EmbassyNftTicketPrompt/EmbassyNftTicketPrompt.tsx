import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import Loading from "../Shared/Loading";
import classNames from "classnames";
import { useVaults } from "hooks/useVaults";
import { ipfsTransformUri } from "utils";
import { useEffect, useState } from "react";
import RedeemWalletSuccessIcon from "assets/icons/wallet-nfts/wallet-redeem-success.svg";
import "./index.scss";
import "swiper/css";
import NFTMedia from "components/NFTMedia";
import RedeemNftSuccess from "components/RedeemNftSuccess/RedeemNftSuccess";

export default function EmbassyNftTicketPrompt() {
  const { t } = useTranslation();
  const { nftData } = useVaults();
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    if (nftData?.redeemMultipleFromSharesState.status === "Success") {
      setRedeemed(true);
    }
  }, [nftData?.redeemMultipleFromSharesState])

  const showLoader = nftData?.redeemMultipleFromSharesState.status && ["PendingSignature", "Mining"].includes(nftData?.redeemMultipleFromSharesState.status);

  const nfts = nftData?.nftTokens?.filter(nft => nft.isDeposit).map(({ nftInfo }, index) =>
    <SwiperSlide key={index}>
      <NFTMedia key={index} link={ipfsTransformUri(nftInfo.image)} />
    </SwiperSlide>)

  if (redeemed) return <RedeemNftSuccess />;

  return (
    <div className={classNames("embassy-nft-ticket-wrapper", { "disabled": showLoader })}>
      <img className="embassy-nft-ticket__icon" src={RedeemWalletSuccessIcon} alt="wallet" />
      {t("EmbassyNftTicketPrompt.text")}
      <Swiper
        spaceBetween={1}
        slidesPerView={3}
        speed={500}
        touchRatio={1.5}
        navigation={true}
        effect={"flip"}>
        {nfts}
      </Swiper>
      <button onClick={nftData?.redeemShares} className="embassy-nft-ticket__redeem-btn fill">{t("EmbassyNftTicketPrompt.button-text")}</button>
      {showLoader && <Loading />}
    </div>
  )
}
