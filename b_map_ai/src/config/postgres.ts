import { Pool, PoolConfig, QueryResult, QueryResultRow } from "pg";
import { config } from "./index";

export interface PostgresHealth {
  isConnected: boolean;
  status: "connected" | "connecting" | "disconnected" | "error";
  provider: "Neon Serverless PostgreSQL";
  host?: string;
  database?: string;
  poolTotal?: number;
  poolIdle?: number;
  poolWaiting?: number;
  serverVersion?: string;
  error?: string;
}

export class PostgresManager {
  private static pool: Pool | null = null;
  private static isConnected = false;
  private static isInitializing = false;
  private static serverVersion = "";

  /**
   * Initializes and connects to the Neon PostgreSQL connection pool.
   */
  public static async connect(): Promise<boolean> {
    if (this.isConnected && this.pool) {
      return true;
    }
    if (this.isInitializing) {
      return false;
    }

    this.isInitializing = true;
    const connectionString = config.databaseUrl;

    try {
      console.log(`[PostgresManager] Initializing Neon PostgreSQL pool...`);

      // Strip or sanitize options while upgrading to sslmode=verify-full for modern libpq 3.0 semantics
      let normalizedConnectionString = connectionString;
      if (normalizedConnectionString.includes("sslmode=require")) {
        normalizedConnectionString = normalizedConnectionString.replace("sslmode=require", "sslmode=verify-full");
      }

      const isRemoteSsl =
        normalizedConnectionString.includes("sslmode=verify-full") ||
        normalizedConnectionString.includes("neon.tech") ||
        config.nodeEnv === "production";

      const poolConfig: PoolConfig = {
        connectionString: normalizedConnectionString,
        ssl: isRemoteSsl
          ? {
              rejectUnauthorized: process.env.PG_REJECT_UNAUTHORIZED !== "false",
            }
          : undefined,
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000,
      };

      this.pool = new Pool(poolConfig);

      this.pool.on("error", (err) => {
        console.error(`[PostgresManager] Unexpected pool error on idle client: ${err.message}`);
      });

      // Test connectivity
      const testRes = await this.pool.query("SELECT version() as ver, current_database() as db");
      this.serverVersion = testRes.rows[0]?.ver || "";
      const currentDb = testRes.rows[0]?.db || "";

      this.isConnected = true;
      this.isInitializing = false;
      console.log(`[PostgresManager] Connected to Neon PostgreSQL DB '${currentDb}' successfully!`);

      // Initialize database tables and indexes automatically
      await this.initSchema();
      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.isInitializing = false;
      console.error(`[PostgresManager] Connection to Neon PostgreSQL failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Executes a parameterized SQL query.
   */
  public static async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      const connected = await this.connect();
      if (!connected || !this.pool) {
        throw new Error("PostgreSQL pool is not initialized or connected.");
      }
    }
    return await this.pool.query<T>(text, params);
  }

  /**
   * Automatically provisions production tables, constraints, and indexes.
   */
  public static async initSchema(): Promise<void> {
    if (!this.pool) return;

    console.log(`[PostgresManager] Verifying / applying production schemas...`);

    const schemaSql = `
      -- 1. Copilot Active Navigation Sessions
      CREATE TABLE IF NOT EXISTS copilot_sessions (
        session_id VARCHAR(128) PRIMARY KEY,
        driver_id VARCHAR(128) DEFAULT 'anonymous_driver',
        active_route_id VARCHAR(128) NOT NULL,
        destination_name VARCHAR(256) NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW(),
        latest_telemetry JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 2. Multi-turn Copilot In-Drive Dialog & Tool Executions
      CREATE TABLE IF NOT EXISTS copilot_turns (
        id BIGSERIAL PRIMARY KEY,
        turn_id VARCHAR(128) NOT NULL,
        session_id VARCHAR(128) REFERENCES copilot_sessions(session_id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        role VARCHAR(32) NOT NULL,
        prompt TEXT,
        response TEXT,
        classified_intent VARCHAR(64),
        confidence DOUBLE PRECISION,
        thought_process TEXT,
        thinking_tokens INTEGER DEFAULT 0,
        telemetry_snapshot JSONB,
        executed_actions JSONB,
        ui_suggestions JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 3. Computer Vision Hazards & Multimodal Incidents
      CREATE TABLE IF NOT EXISTS vision_incidents (
        incident_id VARCHAR(128) PRIMARY KEY,
        incident_type VARCHAR(64) NOT NULL,
        severity VARCHAR(32) NOT NULL,
        confidence DOUBLE PRECISION DEFAULT 1.0,
        coordinates JSONB NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        speed_limit_detected VARCHAR(32),
        advisory TEXT,
        reported_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(32) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 4. POI Master Knowledge & EV Amenities
      CREATE TABLE IF NOT EXISTS master_pois (
        master_poi_id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(256) NOT NULL,
        category VARCHAR(64) NOT NULL,
        coordinates JSONB NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        sentiment_score INTEGER DEFAULT 80,
        metadata JSONB,
        verified BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 5. Dynamic Map Changes & Road Geometry Modifications
      CREATE TABLE IF NOT EXISTS road_changes (
        change_id VARCHAR(128) PRIMARY KEY,
        road_segment_id VARCHAR(128) NOT NULL,
        change_type VARCHAR(64) NOT NULL,
        description TEXT,
        detected_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 6. Gemma 3 LLM Inference Audit, Latency & Thinking Logs
      CREATE TABLE IF NOT EXISTS llm_inference_logs (
        log_id BIGSERIAL PRIMARY KEY,
        model VARCHAR(128) NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        thought_process TEXT,
        thinking_tokens INTEGER DEFAULT 0,
        latency_ms DOUBLE PRECISION NOT NULL,
        deep_thinking_enabled BOOLEAN DEFAULT FALSE,
        knowledge_grounded BOOLEAN DEFAULT TRUE,
        client_ip VARCHAR(64),
        session_id VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 7. High-Performance Indexes
      CREATE INDEX IF NOT EXISTS idx_copilot_turns_session ON copilot_turns(session_id);
      CREATE INDEX IF NOT EXISTS idx_copilot_turns_intent ON copilot_turns(classified_intent);
      CREATE INDEX IF NOT EXISTS idx_vision_incidents_lat_lng ON vision_incidents(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_vision_incidents_status ON vision_incidents(status);
      CREATE INDEX IF NOT EXISTS idx_master_pois_category ON master_pois(category);
      CREATE INDEX IF NOT EXISTS idx_llm_inference_logs_model ON llm_inference_logs(model);
      CREATE INDEX IF NOT EXISTS idx_llm_inference_logs_created ON llm_inference_logs(created_at DESC);
    `;

    try {
      await this.pool.query(schemaSql);
      console.log(`[PostgresManager] Production schemas & indexes confirmed active.`);
    } catch (err: any) {
      console.error(`[PostgresManager] Error initializing schemas: ${err.message}`);
    }
  }

  /**
   * Health and metrics inspection probe
   */
  public static getHealth(): PostgresHealth {
    if (!this.pool || !this.isConnected) {
      return {
        isConnected: false,
        status: "disconnected",
        provider: "Neon Serverless PostgreSQL",
        error: "PostgreSQL pool is not connected.",
      };
    }

    try {
      // Extract host and database from connection string
      const url = new URL(config.databaseUrl);
      return {
        isConnected: true,
        status: "connected",
        provider: "Neon Serverless PostgreSQL",
        host: url.hostname,
        database: url.pathname.replace("/", ""),
        poolTotal: this.pool.totalCount,
        poolIdle: this.pool.idleCount,
        poolWaiting: this.pool.waitingCount,
        serverVersion: this.serverVersion.slice(0, 45),
      };
    } catch {
      return {
        isConnected: true,
        status: "connected",
        provider: "Neon Serverless PostgreSQL",
        poolTotal: this.pool.totalCount,
        poolIdle: this.pool.idleCount,
        poolWaiting: this.pool.waitingCount,
      };
    }
  }

  /**
   * Graceful pool teardown
   */
  public static async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isConnected = false;
        this.pool = null;
        console.log(`[PostgresManager] Neon PostgreSQL connection pool closed gracefully.`);
      } catch (err: any) {
        console.error(`[PostgresManager] Error closing pool: ${err.message}`);
      }
    }
  }
}
