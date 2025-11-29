import type { InspectOptions } from "node:util";
import type { Logger } from "./logger.ts";

export type LogWriter = (logger: Logger, log: Log) => void;
export type ConsoleLogType = "log" | "info" | "warn" | "error";

export interface Log {
  type: string;
  data: unknown[];
  logString: string;
  timestamp: number;
}

export interface LoggerConfig {
  name: string;
  inspectOptions: InspectOptions;
}

export interface LoggerInterfaceOptions {
  template?: string;
  clearPreviousLogs?: boolean;
}
