import mongoose from "mongoose";
import config from "./index";
import { PostgresManager, PostgresHealth } from "./postgres";

export interface DatabaseHealth {
  isConnected: boolean;
  status: "connected" | "connecting" | "disconnected" | "fallback_in_memory";
  primaryDatabase: "PostgreSQL (Neon Serverless)";
  postgres: PostgresHealth;
  mongo?: {
    isConnected: boolean;
    status: string;
    host?: string;
    database?: string;
  };
  error?: string;
}

export class DatabaseManager {
  private static isMongoConnected = false;
  private static isConnecting = false;

  /**
   * Connect to Neon PostgreSQL (Primary) and MongoDB (Secondary/Optional) with automatic fallback.
   */
  public static async connect(): Promise<boolean> {
    if (this.isConnecting) {
      return false;
    }
    this.isConnecting = true;

    // 1. Connect Primary PostgreSQL (Neon)
    console.log(`[DatabaseManager] Connecting to primary database (Neon PostgreSQL)...`);
    const pgSuccess = await PostgresManager.connect();

    // 2. Connect Secondary MongoDB (Optional)
    const uri = config.mongoUri;
    try {
      console.log(`[DatabaseManager] Connecting to secondary store (MongoDB)...`);
      mongoose.set("strictQuery", true);

      await mongoose.connect(uri, {
        maxPoolSize: 25,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 4000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 5000,
      });

      this.isMongoConnected = true;
      console.log(`[DatabaseManager] MongoDB connected successfully to: ${mongoose.connection.host}`);
    } catch (err: any) {
      this.isMongoConnected = false;
      console.warn(
        `[DatabaseManager] Secondary MongoDB offline (${err.message}). ` +
        `Primary Neon PostgreSQL is active.`
      );
    }

    this.isConnecting = false;
    return pgSuccess || this.isMongoConnected;
  }

  /**
   * Database connectivity and pooling health probe across PostgreSQL and MongoDB
   */
  public static getHealth(): DatabaseHealth {
    const pgHealth = PostgresManager.getHealth();
    const readyState = mongoose.connection.readyState;

    let mongoStatus = "disconnected";
    if (readyState === 1) mongoStatus = "connected";
    else if (readyState === 2) mongoStatus = "connecting";

    const isConnected = pgHealth.isConnected || readyState === 1;

    return {
      isConnected,
      status: isConnected ? "connected" : "fallback_in_memory",
      primaryDatabase: "PostgreSQL (Neon Serverless)",
      postgres: pgHealth,
      mongo: {
        isConnected: readyState === 1,
        status: mongoStatus,
        host: mongoose.connection.host,
        database: mongoose.connection.name,
      },
      error: !isConnected ? "All persistent stores offline. Using in-memory fallback." : undefined,
    };
  }

  /**
   * Graceful disconnect on shutdown
   */
  public static async disconnect(): Promise<void> {
    await PostgresManager.disconnect();
    if (this.isMongoConnected) {
      try {
        await mongoose.connection.close();
        this.isMongoConnected = false;
        console.log(`[DatabaseManager] MongoDB connection closed gracefully.`);
      } catch (err: any) {
        console.error(`[DatabaseManager] Error disconnecting MongoDB: ${err.message}`);
      }
    }
  }
}

// Setup connection lifecycle event handlers
mongoose.connection.on("disconnected", () => {
  console.warn(`[DatabaseManager] MongoDB disconnected. Falling back to in-memory store.`);
});

mongoose.connection.on("reconnected", () => {
  console.log(`[DatabaseManager] MongoDB reconnected.`);
});

mongoose.connection.on("error", (err) => {
  console.error(`[DatabaseManager] MongoDB connection error: ${err.message}`);
});

export default DatabaseManager;
