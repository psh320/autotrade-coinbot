import ccxt, { Exchange } from "ccxt";
import schedule from "node-schedule";

export class TraderTest {
  private exchange: Exchange;
  private symbol: string;
  private targetBuyPrice: number | null = null;

  constructor(apiKey: string, secret: string, symbol: string) {
    this.exchange = new ccxt.binance({ apiKey, secret });
    this.symbol = symbol;
  }

  public async fetchDailyOHLCV(date: Date) {
    try {
      const since = date.setUTCHours(0, 0, 0, 0);
      const ohlcv = await this.exchange.fetchOHLCV(this.symbol, "1d", since, 1);
      return {
        timestamp: since,
        open: ohlcv[0][1],
        high: ohlcv[0][2],
        low: ohlcv[0][3],
        close: ohlcv[0][4],
      };
    } catch (error) {
      console.error("Error fetching daily OHLCV:", error);
      return null;
    }
  }

  public async checkBuyOpportunity() {
    try {
      if (this.targetBuyPrice === null) {
        console.log("Target buy price not set. Skipping trade check.");
        return;
      }
      const currentPrice = await this.fetchPrice();
      console.log(currentPrice, this.targetBuyPrice);
      if (currentPrice >= this.targetBuyPrice) {
        console.log("entered!");
        const balance = (await this.exchange.fetchBalance()) as any;
        const usdtBalance = balance.total["USDT"];
        if (usdtBalance > 1) {
          const amountToBuy = (usdtBalance / currentPrice).toFixed(4);
          if (parseFloat(amountToBuy) > 0.0001) {
            await this.exchange.createMarketBuyOrder(
              this.symbol,
              parseFloat(amountToBuy)
            );
            console.log(
              `Bought ${amountToBuy} of ${this.symbol} at ${currentPrice}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error checking buy opportunity:", error);
    }
  }

  public async setDailyTargetPrice() {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayPrice = await this.fetchDailyOHLCV(yesterday);
      if (yesterdayPrice && yesterdayPrice.timestamp !== 0) {
        const k_scale = 0.25;
        this.targetBuyPrice =
          yesterdayPrice.close! +
          (yesterdayPrice.high! - yesterdayPrice.low!) * k_scale;
        console.log(`Target Buy Price set for today: ${this.targetBuyPrice}`);
      }
    } catch (error) {
      console.error("Error setting daily target price:", error);
    }
  }

  public async startTrading() {
    // schedule.scheduleJob("5 0 * * *", async () => {
    //   try {
    //     await this.sellAllCoinIfAny();
    //     await this.setDailyTargetPrice();
    //   } catch (error) {
    //     console.error("Error in scheduled job at 00:05 UTC:", error);
    //   }
    // });
    // schedule.scheduleJob("*/1 * * * *", async () => {
    //   try {
    //     await this.checkBuyOpportunity();
    //   } catch (error) {
    //     console.error("Error in scheduled job every minute:", error);
    //   }
    // });
    await this.setDailyTargetPrice();
    try {
      this.checkBuyOpportunity();
    } catch (error) {
      console.error("Error in scheduled job every minute:", error);
    }
  }

  private async fetchPrice(): Promise<number> {
    try {
      const ticker = await this.exchange.fetchTicker(this.symbol);
      return ticker.last!;
    } catch (error) {
      console.error("Error fetching price:", error);
      return 0;
    }
  }

  private async sellAllCoinIfAny() {
    try {
      const balance = await this.exchange.fetchBalance();
      const coinBalance = balance["ETH"].free as number;

      if (coinBalance > 0.0001) {
        console.log(`Selling ${coinBalance} ETH...`);
        const order = await this.exchange.createMarketSellOrder(
          this.symbol,
          coinBalance
        );
        console.log(`Sold ${order.amount} of ${this.symbol} at ${order.price}`);
      } else {
        console.log("No ETH available to sell.");
      }
    } catch (error) {
      console.error("Error selling coin:", error);
    }
  }
}
