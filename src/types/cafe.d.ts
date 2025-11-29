import type { AddressInfo } from "node:net";
import type { Cafe } from "../cafe.ts";
import type { CallbackFunction } from "./utils.d.ts";

export type MenuPattern = string | RegExp;

export interface EventMap {
  listening: [Cafe, AddressInfo];
  listenError: [Error, Cafe];
  stoplistening: [Cafe];
}

export interface Config {
  alias: Record<string, string>;
  basePath: string;
  menu: Record<"include" | "exclude", MenuPattern[]>;
  exposeAPI: boolean;
  broadcastVersion: boolean;
  debugResponseHeaders: boolean;
}

export interface PartialConfig {
  alias?: Record<string, string>;
  basePath?: string;
  menu?: {
    include?: MenuPattern[];
    exclude?: MenuPattern[];
  };
  exposeAPI?: boolean;
  broadcastVersion?: boolean;
  debugResponseHeaders?: boolean;
}

export interface ListenOptions {
  incremental?: boolean;
  retryCount?: number;
  retryInterval?: number;
}

export type Status = keyof StatusMap;

export type StatusArray = [
  logLevel: number,
  logMessage: (...data: any[]) => string,
  failureMessage: (...data: any[]) => string,
];

export interface StatusMap {
  ACQUIRING_FILESYSTEM_HANDLE: StatusArray;
  GETTING_HANDLE_STATS: StatusArray;
  VALIDATING_HANDLE_TYPE: StatusArray;
  VALIDATING_REQUESTED_RANGE: StatusArray;
  SERVING_FILE: StatusArray;
}
