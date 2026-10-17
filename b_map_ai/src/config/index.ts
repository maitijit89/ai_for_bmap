import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("[SECURITY CRITICAL] DATABASE_URL must be defined in production environment.");
        })()
      : "postgresql://postgres:postgres@127.0.0.1:5432/b_map_ai"),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bmap_ai",
  apiKey: process.env.BMAP_API_KEY || "",
  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("[SECURITY CRITICAL] JWT_SECRET must be defined in production environment.");
        })()
      : "bmap_dev_only_ephemeral_secret_key_change_in_prod"),
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : process.env.NODE_ENV === "production"
      ? ["http://localhost:3000"]
      : ["*"],
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || "120", 10), // 120 reqs/min
  },
  gemma: {
    host: process.env.GEMMA_HOST || "127.0.0.1",
    port: parseInt(process.env.GEMMA_PORT || "5005", 10),
    apiUrl: process.env.GEMMA_API_URL || "http://127.0.0.1:5005",
    pythonPath: process.env.PYTHON_PATH || "e:\\v\\Scripts\\python.exe",
    gemmaDir: process.env.GEMMA_DIR || path.resolve(__dirname, "../../gemma"),
    autoStart: process.env.AUTO_START_GEMMA !== "false",
  },
  runBugTest: process.env.RUN_BUG_TEST === "true",
};

export default config;
