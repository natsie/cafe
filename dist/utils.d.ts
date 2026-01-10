import type { PathLike } from "node:fs";
import type { CreateReadStreamOptions, Deferred } from "./types/utils.d.ts";
import type { Server as HTTPServer } from "node:http";
import type { Http2Server as HTTP2Server } from "node:http2";
import type { AddressInfo } from "node:net";
export declare const noop: (...args: unknown[]) => null;
export declare const createReadStream: (path: PathLike, options?: CreateReadStreamOptions) => AsyncGenerator<Buffer<ArrayBuffer>, void, unknown>;
export declare const createDeferred: <T>() => Promise<Deferred<T>>;
export declare const getAddressInfo: (server: HTTPServer | HTTP2Server) => AddressInfo;
export declare const obj: {
    omit: <T extends {}, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
    pick: <T, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
    merge: <T, U, V, W>(sources_0?: T | undefined, sources_1?: U | undefined, sources_2?: V | undefined, sources_3?: W | undefined) => T & U & V & W;
    mergeInto: <T extends object, U, V, W>(sources_0: T, sources_1?: U | undefined, sources_2?: V | undefined, sources_3?: W | undefined) => T & U & V & W;
};
export declare const str: {
    substitute: (inputStr: string, substitionMap: Map<string | RegExp, string> | Record<string, string>) => string;
};
export declare const numberToBytes: (num: number | bigint) => number[];
export declare const bytesToNumber: (bytes: number[]) => number | bigint;
export declare const readJSONFromFile: <T>(path: PathLike, encoding?: BufferEncoding) => Promise<T>;
//# sourceMappingURL=utils.d.ts.map