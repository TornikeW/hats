import { usePrevious } from "hooks/usePrevious";
import { useVaults } from "hooks/useVaults";
import { useEffect } from "react";

export const useCheckRedeemableNfts = async (toggleAirdropPrompt: () => void) => {
  const { nftData } = useVaults();
  const { isBeforeDeadline, airdropToRedeem } = nftData || {};
  const prevAirdropToRedeem = usePrevious(airdropToRedeem);

  useEffect(() => {
    if (isBeforeDeadline && airdropToRedeem && prevAirdropToRedeem !== airdropToRedeem) {
      toggleAirdropPrompt();
    }
  }, [isBeforeDeadline,
    airdropToRedeem,
    toggleAirdropPrompt,
    prevAirdropToRedeem])
}
