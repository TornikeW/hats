import { BigNumber } from "ethers";
import { formatUnits } from "@ethersproject/units";

export class Amount {
  amount: BigNumber | undefined;
  decimals: string;
  symbol: string | undefined;

  constructor(amount: BigNumber | undefined, decimals: string, symbol?: string) {
    this.amount = amount;
    this.decimals = decimals;
    this.symbol = symbol;
  }

  get bigNumber() {
    return this.amount ? this.amount : BigNumber.from(0);
  }

  get number() {
    return this.amount ? Number(formatUnits(this.amount, this.decimals)) : 0;
  }

  get formattedWithoutSymbol() {
    return `${this.amount ? this.truncateNDecimals(5) : "-"}`;
  }

  get formatted() {
    const symbol = this.symbol ? ` ${this.symbol}` : "";
    return `${this.formattedWithoutSymbol}${symbol}`;
  }

  get string() {
    return this.amount ? formatUnits(this.amount, this.decimals) : "0";
  }

  private truncateNDecimals(decimals: number) {
    // truncate n decimals and remove trailing zeros
    const [int, decimal] = this.string.split(".");
    if (!decimal) return int;
    const decimalPart = decimal.substring(0, decimals).replace(/0+$/, "");
    return `${int}${decimalPart ? `.${decimalPart}` : ""}`;
  }
}
