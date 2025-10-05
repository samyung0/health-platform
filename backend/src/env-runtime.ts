import { parseEnv } from "@/env";
import { config } from "dotenv";
import { existsSync } from "fs";
import { join } from "path";

/**
 * Load environment variables based on NODE_ENV
 * Priority: .env.{NODE_ENV}.local > .env.local > .env.{NODE_ENV} > .env
 */
function loadEnvironment() {
  const nodeEnv = process.env.NODE_ENV || "development";

  // Define the order of env files to load (later files override earlier ones)
  const envFiles = [".env", `.env.${nodeEnv}`, ".env.local", `.env.${nodeEnv}.local`];

  // Load each env file if it exists (look in project root)
  envFiles.forEach((file) => {
    const envPath = join(process.cwd(), "..", file);
    if (existsSync(envPath)) {
      console.log(`Loading environment from: ${file}`);
      config({ path: envPath });
    }
  });

  // Parse and validate the final environment
  return parseEnv(process.env);
}

export default loadEnvironment();
