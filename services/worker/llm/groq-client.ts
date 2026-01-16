import path from "path";
import { config as dotenvConfig } from "dotenv";
import Groq from "groq-sdk";

// carrega .env da raiz
dotenvConfig({ path: path.resolve("../..", ".env") });

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
