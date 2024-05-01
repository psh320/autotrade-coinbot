import ccxt, { Exchange } from "ccxt";
import schedule from "node-schedule";

export class Trader {
  private exchange: Exchange;
  private symbol: string;
  private targetBuyPrice: number | null = null;

  constructor(apiKey: string, secret: string, symbol: string) {
    this.exchange = new ccxt.binance({ apiKey, secret });
    this.symbol = symbol;
  }

  public async fetchDailyOHLCV(date: Date) {
    // Convert date to timestamp and adjust to the exchange's UTC midnight
    const since = date.setUTCHours(0, 0, 0, 0);
    const ohlcv = await this.exchange.fetchOHLCV(this.symbol, "1d", since, 1);
    return {
      timestamp: since,
      open: ohlcv[0][1],
      high: ohlcv[0][2],
      low: ohlcv[0][3],
      close: ohlcv[0][4],
    };
  }

  public async checkBuyOpportunity() {
    if (this.targetBuyPrice === null) {
      console.log("Target buy price not set. Skipping trade check.");
      return;
    }
    const currentPrice = await this.fetchPrice(); // Fetch current spot price

    if (currentPrice <= this.targetBuyPrice) {
      const balance = (await this.exchange.fetchBalance()) as any;
      const usdtBalance = balance.total["USDT"];
      if (usdtBalance > 0) {
        const amountToBuy = (usdtBalance / currentPrice).toFixed(6);
        await this.exchange.createMarketBuyOrder(
          this.symbol,
          parseFloat(amountToBuy)
        );
        console.log(
          `Bought ${amountToBuy} of ${this.symbol} at ${currentPrice}`
        );
      }
    } else {
      console.log(
        `봇이 5분 간격으로 가격 확인 중입니다! 현재가격: ${currentPrice}! ${this.targetBuyPrice} 넘으면 바로 삽니다!`
      );
    }
  }

  public async setDailyTargetPrice() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayPrice = await this.fetchDailyOHLCV(yesterday);
    if (yesterdayPrice.timestamp !== 0) {
      const k_scale = 0.25;
      this.targetBuyPrice =
        yesterdayPrice.close! +
        (yesterdayPrice.high! - yesterdayPrice.low!) * k_scale;
      console.log(`Target Buy Price set for today: ${this.targetBuyPrice}`);
    }
  }

  public startTrading() {
    // Schedule the target price setting and sell operation to run every day at 00:05 UTC
    schedule.scheduleJob("5 0 * * *", async () => {
      await this.sellAllBTCIfAny();
      await this.setDailyTargetPrice();
    });

    // Schedule the price checking and buying opportunity to run every 5 minutes
    schedule.scheduleJob("*/1 * * * *", async () => {
      await this.checkBuyOpportunity();
    });
  }

  private async fetchPrice(): Promise<number> {
    const ticker = await this.exchange.fetchTicker(this.symbol);
    return ticker.last!;
  }

  private async sellAllBTCIfAny() {
    const balance = await this.exchange.fetchBalance();
    const btcBalance = balance["BTC"].free as number; // 'free' property shows the available balance not in orders

    if (btcBalance > 0) {
      console.log(`Selling ${btcBalance} BTC...`);
      // Create a market sell order for all available BTC
      const order = await this.exchange.createMarketSellOrder(
        this.symbol,
        btcBalance
      );
      console.log(`Order executed: ${JSON.stringify(order)}`);
    } else {
      console.log("No BTC available to sell.");
    }
  }
}
