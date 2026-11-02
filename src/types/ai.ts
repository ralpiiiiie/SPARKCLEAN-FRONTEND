/** Types mirror the validated response schema produced by the backend AI module. */

export type MetricFormat = "currency" | "number" | "percent";

export interface AiKpi {
  label: string;
  value: number;
  format: MetricFormat;
  delta?: number;
  deltaLabel?: string;
  trend?: "up" | "down" | "neutral";
  caption?: string;
}

export interface AiChartSeries {
  key: string;
  label: string;
}

export interface AiChart {
  type: "bar" | "line" | "area" | "doughnut" | "comparison";
  title: string;
  subtitle?: string;
  xKey: string;
  series: AiChartSeries[];
  data: Array<Record<string, string | number>>;
  valueFormat: "currency" | "number";
}

export interface AiTableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  format?: MetricFormat;
}

export interface AiTable {
  title: string;
  columns: AiTableColumn[];
  rows: Array<Record<string, string | number>>;
}

export interface AiRange {
  start: string;
  end: string;
  label: string;
  note: string;
}

export interface AiAnswer {
  answer: string;
  kpis: AiKpi[];
  table: AiTable | null;
  chart: AiChart | null;
  range: AiRange | null;
  followups: string[];
  meta: {
    topic: string;
    provider: string;
    model: string;
    degraded: boolean;
    durationMs: number;
    dataBounds: { min: string; max: string; latestMonthLabel: string };
    grounding: string[];
  };
}

export interface AiChatResponse {
  conversationId: number;
  answer: AiAnswer;
}

export interface AiConversationSummary {
  id: number;
  title: string;
  updatedAt: string;
}

export interface AiStoredMessage {
  id: number;
  role: "user" | "assistant";
  content: unknown;
  createdAt: string;
}

export interface AiUser {
  id: number;
  username: string;
  email: string;
  role: "admin" | "analyst" | "manager";
  roleLevel: number;
  branchId: string | null;
  branchName: string | null;
  branchCity: string | null;
}

export interface AiLoginResponse {
  token: string;
  expiresIn: string;
  user: AiUser;
}

export type AiPageContext =
  | "dashboard"
  | "descriptive"
  | "predictive"
  | "prescriptive"
  | "process"
  | "data"
  | "settings"
  | "case-study";
