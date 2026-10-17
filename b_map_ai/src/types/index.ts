export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  prompt: string;
  system_prompt?: string;
  history?: ChatMessage[];
  max_tokens?: number;
  deep_thinking?: boolean;
}

export type TravelMode = "driving" | "walking" | "cycling" | "transit";

export interface NavigationRequest {
  origin: string;
  destination: string;
  travel_mode?: TravelMode;
  preferences?: string;
  additional_context?: string;
  max_tokens?: number;
  deep_thinking?: boolean;
}

export interface PoiSearchRequest {
  location: string;
  category?: string;
  radius_meters?: number;
  preferences?: string;
}

export interface RerouteRequest {
  current_location: string;
  destination: string;
  deviation_reason?: string;
  previous_route_summary?: string;
}

export interface TrafficAdvisoryRequest {
  route_or_area: string;
  reported_issues?: string;
  weather_conditions?: string;
}

export interface LlmResponse {
  response: string;
  thought_process?: string;
  thinking_tokens_estimate?: number;
  deep_thinking_enabled?: boolean;
  model: string;
  status: string;
  latency_ms?: number;
  knowledge_grounded?: boolean;
}

export interface ModelHealth {
  status: "ready" | "loading" | "offline" | "error";
  model: string;
  service: string;
  is_ready: boolean;
  features?: {
    deep_thinking_cot?: boolean;
    geospatial_knowledge_base?: boolean;
    indexed_records?: number;
  };
  checkpoints?: Record<string, any>;
  metrics?: Record<string, any>;
  error?: string;
}
