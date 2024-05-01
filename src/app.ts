import dotenv from "dotenv";
import { Trader } from "./Trader";

dotenv.config();

const apiKey = process.env.BINANCE_API_KEY!;
const secret = process.env.BINANCE_SECRET!;
const symbol = "BTC/USDT"; // Define the trading pair

const trader = new Trader(apiKey, secret, symbol);
trader.startTrading();
