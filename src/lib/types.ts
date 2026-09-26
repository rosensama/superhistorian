export interface HistoryNode {
  id: string;
  title: string;
  summary: string;
  timeRange: {
    start: string;
    end: string;
  };
  geographicScope: string;
  parentId: string | null;
  children: HistoryNode[];
  splitAxis: "time" | "geography" | null;
  depth: number;
}

export interface SplitByTimeResponse {
  phases: {
    title: string;
    start: string;
    end: string;
    summary: string;
  }[];
}

export interface SplitByGeoResponse {
  regions: {
    regionName: string;
    summary: string;
  }[];
}

export interface JumpToTopicResponse {
  title: string;
  start: string;
  end: string;
  geographicScope: string;
  summary: string;
}

export interface EssayResponse {
  essay: string;
}

export interface DefineResponse {
  definition: string;
}

export interface DebugEntry {
  id: string;
  timestamp: number;
  action: string;
  model: string;
  prompt: string;
  nodeTitle: string; // title of the card being worked on
  nodeDepth: number; // depth level in the tree (0 = root)
  response: Record<string, unknown> | null; // null = still in-flight
  completedAt: number | null; // null = still in-flight
  error: string | null;
}

export interface ExploreRequest {
  action: "split-time" | "split-geography" | "jump-to-topic" | "essay" | "define";
  node?: HistoryNode;
  query?: string;
  term?: string;
  context?: string;
  model?: string;
  language?: string;
  essayStyle?: string;
  defineStyle?: string;
}

export interface ApiError {
  error: string;
}

export interface GenerateImageResponse {
  imageUrl: string;
}

// Mapped so results stay assignable to Record<string, unknown> for the debug log
export type ApiResult<T> = { [K in keyof T]: T[K] } & Partial<ApiError>;

export type SplitResult = ApiResult<Partial<SplitByTimeResponse & SplitByGeoResponse>>;
