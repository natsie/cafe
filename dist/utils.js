import { check, nonNullable } from "broadutils/validate";
import { open, readFile } from "node:fs/promises";
export const createReadStream = async function* (path, options) {
    const handle = await open(path);
    const stat = await handle.stat().catch((error) => {
        handle.close();
        throw error;
    });
    try {
        let offset = options?.offset ?? 0;
        let endOffset = options?.length == null ? stat.size : offset + Math.floor(options.length);
        let chunkSize = options?.chunkSize ?? 16384;
        while (offset < endOffset) {
            const readSize = Math.min(chunkSize, endOffset - offset);
            const chunk = await handle.read(Buffer.allocUnsafe(readSize), 0, readSize, offset);
            offset += chunk.bytesRead;
            yield chunk.buffer;
        }
    }
    finally {
        await handle.close();
    }
};
export const parseRangeHeader = (range, fileSize) => {
    if (!range)
        return [[0, fileSize]];
    const ranges = [];
    const parts = range.split(/,\s*/);
    const rangeRegex = /(?:(\d+)\-(\d+)?)|(?:(\-\d+))/;
    for (const part of parts) {
        // match format: [input, start, end, lastN]
        const match = part.match(rangeRegex);
        if (!match)
            return null;
        if (match[1]) {
            const start = Number.parseInt(match[1]);
            const end = match[2] != null ? Number.parseInt(match[2]) : fileSize - 1;
            if (start > end)
                return null;
            if (start < 0 || end < 0)
                return null;
            if (start > fileSize - 1 || end > fileSize - 1)
                return null;
            ranges.push([start, end - start + 1]);
            continue;
        }
        if (match[3]) {
            const lastN = Number.parseInt(match[3]);
            const start = fileSize + lastN;
            if (start < 0)
                return null;
            ranges.push([start, -lastN]);
            continue;
        }
    }
    return ranges;
};
export const numberToBytes = (num) => {
    if (check.number.float(num)) {
        return [0b00, ...new Uint8Array(new Float64Array([num]).buffer)];
    }
    const biCache = [0n, 8n, 255n];
    const number = BigInt(num);
    const bytes = [number < biCache[0] ? 0b10 : 0b11];
    let value = number < biCache[0] ? number * -1n : number;
    do {
        bytes.push(Number(value & biCache[2]));
        value >>= biCache[1];
    } while (value);
    return bytes;
};
export const bytesToNumber = (bytes) => {
    if (bytes.length < 1)
        return 0;
    if (check.number.integer(bytes[0]) && bytes[0] === 0) {
        return nonNullable(new Float64Array(new Uint8Array(bytes.slice(1)).buffer)[0]);
    }
    const isPositive = nonNullable(bytes.shift()) & 0b1;
    let result = 0n;
    for (let i = 0; i < bytes.length; ++i)
        result += BigInt(bytes[i] ?? 0) << (8n * BigInt(i));
    return result > BigInt(Number.MAX_SAFE_INTEGER)
        ? result * BigInt(isPositive - 1 || 1)
        : Number(result) * (isPositive - 1 || 1);
};
export const readJSONFromFile = async (path, encoding = "utf8") => {
    const fileContents = await readFile(path, encoding);
    return JSON.parse(fileContents);
};
//# sourceMappingURL=utils.js.map