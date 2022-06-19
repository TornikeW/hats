import { useQuery } from "@apollo/client";
import { useTransactions } from "@usedapp/core";
import {
  updateRewardsToken,
  updateTokenPrices,
  updateVaults,
  updateWithdrawSafetyPeriod
} from "actions";
import { PROTECTED_TOKENS } from "data/vaults";
import { GET_MASTER_DATA, GET_VAULTS } from "graphql/subgraph";
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducers";
import { POLL_INTERVAL } from "settings";
import { IVault, IVaultDescription } from "types/types";
import { getTokensPrices, getWithdrawSafetyPeriod, ipfsTransformUri } from "utils";

export function useVaults() {
  const dispatch = useDispatch();
  const { data: vaultsData } = useQuery<{ vaults: IVault[] }>(GET_VAULTS, { pollInterval: POLL_INTERVAL });
  const { data: masterData } = useQuery(GET_MASTER_DATA);
  const { vaults, tokenPrices } = useSelector((state: RootState) => state.dataReducer);

  const currentTransaction = useTransactions().transactions.find(tx => !tx.receipt);

  useEffect(() => {
    if (masterData) {
      const { rewardsToken, withdrawPeriod, safetyPeriod } = masterData.masters[0];
      dispatch(updateRewardsToken(rewardsToken));
      dispatch(
        updateWithdrawSafetyPeriod(
          getWithdrawSafetyPeriod(withdrawPeriod, safetyPeriod)
        )
      );
      //dispatch(updateHatsPrice(await getTokenPrice(rewardsToken)));
    }
  }, [masterData, dispatch]);


  const getVaults = useCallback(async () => {
    const loadVaultDescription = async (vault: IVault): Promise<IVaultDescription | undefined> => {
      if (vault.descriptionHash && vault.descriptionHash !== "") {
        try {
          const dataResponse = await fetch(ipfsTransformUri(vault.descriptionHash)!)
          const object = await dataResponse.json()
          return fixObject(object)
        } catch (error) {
          console.error(error);
          return undefined;
        }
      }
      return undefined;
    }

    if (vaultsData) {
      const vaultsWithData = await Promise.all(
        (vaultsData.vaults).map(async (vault) => ({
          ...vault,
          stakingToken: PROTECTED_TOKENS.hasOwnProperty(vault.stakingToken) ?
            PROTECTED_TOKENS[vault.stakingToken]
            : vault.stakingToken,
          description: await loadVaultDescription(vault)
        })));

      // mock one vault with multiple tokens based on other vaults as additional vaults
      vaultsWithData[1].multipleVaults = [vaultsWithData[1], vaultsWithData[11], vaultsWithData[3], vaultsWithData[4], vaultsWithData[5]];
      if (vaultsWithData[1].description) {
        vaultsWithData[1].description["additional-vaults"] = [vaultsWithData[1].pid, vaultsWithData[11].pid, vaultsWithData[3].pid, vaultsWithData[4].pid, vaultsWithData[5].pid];
      }

      dispatch(updateVaults(vaultsWithData));
    }
  }, [vaultsData, dispatch]);

  const getPrices = useCallback(async () => {
    if (vaults) {
      const stakingTokens = vaults?.map(
        (vault) => vault.stakingToken
      );
      const uniqueTokens = Array.from(new Set(stakingTokens!));
      const tokenPrices = (await getTokensPrices(uniqueTokens!));

      if (tokenPrices) {
        dispatch(updateTokenPrices(tokenPrices));
      }
    }
  }, [vaults, dispatch]);

  useEffect(() => {
    if (vaults && (!tokenPrices || Object.keys(tokenPrices).length === 0)) {
      getPrices();
    }
  }, [vaults, tokenPrices, getPrices]);

  useEffect(() => {
    if (currentTransaction == null) {
      getVaults()
    }
  }, [currentTransaction, getVaults]);

  return { vaults, getVaults };
}

export const fixObject = (description: any): IVaultDescription => {
  if ("Project-metadata" in description) {
    description["project-metadata"] = description["Project-metadata"]
    delete description["Project-metadata"]
  }
  return description;
}
