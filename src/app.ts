import dotenv from "dotenv";
import { Trader } from "./Trader";
import { TraderTest } from "./TraderTest";

dotenv.config();

const apiKey = process.env.BINANCE_API_KEY!;
const secret = process.env.BINANCE_SECRET!;
const symbol = "ETH/USDT"; // Define the trading pair

const trader = new Trader(apiKey, secret, symbol);
trader.startTrading();

// Test Trader to play with
// const traderTest = new TraderTest(apiKey, secret, symbol);
// traderTest.startTrading();
