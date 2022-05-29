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
  const { data: vaultsData } = useQuery(GET_VAULTS, { pollInterval: POLL_INTERVAL });
  const { data: masterData } = useQuery(GET_MASTER_DATA);
  const { vaults, tokenPrices } = useSelector(
    (state: RootState) => state.dataReducer
  );

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

  const fixObject = (description: any): IVaultDescription => {
    if ("Project-metadata" in description) {
      description["project-metadata"] = description["Project-metadata"]
      delete description["Project-metadata"]
    }
    return description;
  }

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
        (vaultsData.vaults as IVault[]).map(async (vault): Promise<IVault> => ({
          ...vault,
          stakingToken: PROTECTED_TOKENS.hasOwnProperty(vault.stakingToken) ?
            PROTECTED_TOKENS[vault.stakingToken]
            : vault.stakingToken,
          description: await loadVaultDescription(vault)
        })));

      /// mock one vault with multiple tokens based on other vaults as additional vaults
      const firstVault = vaultsData[0] as IVault;
      const additionalVaults = [vaultsData[1] as IVault, vaultsData[2] as IVault];
      firstVault.description!["additional-vaults"] = additionalVaults.map(vault => vault.pid)

      for (const vault of vaultsWithData) {
        if (vault.description?.["additional-vaults"]) {
          const additionalPids = vault.description?.["additional-vaults"]
          const addtionalVaults = additionalPids
            .map(pid => vaultsWithData.find(v => v.pid === pid))
            .filter(v => v) as IVault[]
          vault.multipleVaults = [vault, ...additionalVaults];
        }
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
      const tokenPrices = await getTokensPrices(uniqueTokens!);

      if (tokenPrices) {
        dispatch(updateTokenPrices(tokenPrices));
        dispatch(
          updateVaults(
            vaults.map((vault) => {
              const prices = tokenPrices[vault.stakingToken];
              const tokenPrice = prices ? prices["usd"] : undefined;
              return {
                ...vault,
                tokenPrice
              };
            })
          )
        );
      }
    }
  }, [vaults, dispatch]);

  useEffect(() => {
    if (vaults && Object.keys(tokenPrices).length === 0) {
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
