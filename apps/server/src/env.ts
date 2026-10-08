import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import dotenv from "dotenv";

for (const path of [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
  fileURLToPath(new URL("../../../.env.local", import.meta.url)),
  fileURLToPath(new URL("../../../.env", import.meta.url)),
]) dotenv.config({ path });
