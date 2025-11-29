import type { PathLike } from "node:fs";
import type { CreateReadStreamOptions, Deferred } from "./types/utils.d.ts";

import { open, readFile } from "node:fs/promises";
import type { Server as HTTPServer } from "node:http";
import type { Http2Server as HTTP2Server } from "node:http2";
import type { AddressInfo } from "node:net";
import { check, nonNullable } from "./validate.ts";

export const noop = (...args: unknown[]): null => null;

export const createReadStream = async function* (
  path: PathLike,
  options?: CreateReadStreamOptions,
) {
  const handle = await open(path);
  const stat = await handle.stat().catch((error) => {
    handle.close();
    throw error;
  });

  try {
    let offset = options?.offset ?? 0;
    let endOffset = options?.length == null ? stat.size : offset + ~~options.length;
    let chunkSize = options?.chunkSize ?? 16384;

    while (offset < endOffset) {
      const readSize = Math.min(chunkSize, endOffset - offset);
      const chunk = await handle.read(Buffer.allocUnsafe(readSize), 0, readSize, offset);

      offset += chunk.bytesRead;
      yield chunk.buffer;
    }
  } finally {
    await handle.close();
  }
};

export const createDeferred = async <T>(): Promise<Deferred<T>> => {
  const deferred: Deferred<T> = {
    promise: {} as Promise<T>,
    resolve: noop,
    reject: noop,
  };

  await new Promise((rresolved) => {
    deferred.promise = new Promise<T>((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
      rresolved(null);
    });
  });

  return deferred;
};

export const getAddressInfo = (server: HTTPServer | HTTP2Server): AddressInfo => {
  const address = nonNullable(server.address());
  if (check.object(address)) return address as AddressInfo;

  const url = new URL(address);
  const family = url.hostname === "::" ? "IPv6" : "IPv4";
  console.log("Returning constructed address object.");
  return {
    address: url.hostname,
    family: family,
    port: +url.port,
  };
};

export const obj = {
  omit: <T extends {}, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = {} as Omit<T, K>;
    const toOmit = new Set(keys);
    for (const [key, value] of Object.entries(obj)) {
      if (toOmit.has(key as K)) continue;
      result[key as Exclude<keyof T, K>] = value as T[Exclude<keyof T, K>];
    }
    return result;
  },
  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    for (const key of keys) result[key] = obj[key];
    return result;
  },
  merge: <T, U, V, W>(...sources: [T?, U?, V?, W?]): {} & T & U & V & W => {
    return Object.assign({}, ...sources);
  },
  mergeInto: <T extends object, U, V, W>(...sources: [T, U?, V?, W?]): T & U & V & W => {
    return Object.assign(...sources);
  },
};

export const str = {
  substitute: (
    inputStr: string,
    substitionMap: Map<string | RegExp, string> | Record<string, string>,
  ) => {
    const subPairs =
      substitionMap instanceof Map ? [...substitionMap] : Object.entries(substitionMap);
    return subPairs.reduce((acc, [key, value]) => acc.replaceAll(key, value), inputStr);
  },
};

export const numberToBytes = (num: number | bigint): number[] => {
  if (check.number.float(num)) {
    return [0b00, ...new Uint8Array(new Float64Array([num]).buffer)];
  }

  const biCache: [bigint, bigint, bigint] = [0n, 8n, 255n];

  const number = BigInt(num);
  const bytes: number[] = [number < biCache[0] ? 0b10 : 0b11];
  let value = number < 0 ? number * -1n : number;

  do {
    bytes.push(Number(value & biCache[2]));
    value >>= biCache[1];
  } while (value);

  return bytes;
};

export const bytesToNumber = (bytes: number[]): number | bigint => {
  if (check.number.integer(bytes[0]) && bytes[0] === 0) {
    return nonNullable(new Float64Array(new Uint8Array(bytes.slice(1)).buffer)[0]);
  }

  if (bytes.length < 1) return 0;
  const isPositive = nonNullable(bytes.shift()) & 0b1;
  let result = 0n;

  for (let i = 0; i < bytes.length; ++i) result += BigInt(bytes[i] ?? 0) << (8n * BigInt(i));
  return result > BigInt(Number.MAX_SAFE_INTEGER)
    ? result * BigInt(isPositive - 1 || 1)
    : Number(result) * (isPositive - 1 || 1);
};

export const readJSONFromFile = async <T>(
  path: PathLike,
  encoding: BufferEncoding = "utf8",
): Promise<T> => {
  const fileContents = await readFile(path, encoding);
  return JSON.parse(fileContents);
};
