import type { PathLike } from "node:fs";
import type { CreateReadStreamOptions } from "./types/utils.d.ts";
export declare const createReadStream: (path: PathLike, options?: CreateReadStreamOptions) => AsyncGenerator<Buffer<ArrayBuffer>, void, unknown>;
export declare const parseRangeHeader: (range: string, fileSize: number) => [startIndex: number, byteCount: number][] | null;
export declare const numberToBytes: (num: number | bigint) => number[];
export declare const bytesToNumber: (bytes: number[]) => number | bigint;
export declare const readJSONFromFile: <T>(path: PathLike, encoding?: BufferEncoding) => Promise<T>;
//# sourceMappingURL=utils.d.ts.map