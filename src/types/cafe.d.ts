import type { AddressInfo } from "node:net";
import type { Cafe } from "../cafe.ts";

export type MenuPattern = string | RegExp;

export interface EventMap {
  listening: [Cafe, AddressInfo | string];
  listenError: [Error, Cafe];
  stoplistening: [Cafe];
}

export interface Config {
  alias: Record<string, string>;
  basePath: string;
  menu: Record<"include" | "exclude", MenuPattern[]>;
  exposeAPI: boolean;
  broadcastVersion: boolean;
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
}

export interface ListenOptions {
  incremental?: boolean;
  retryCount?: number;
  retryInterval?: number;
}
