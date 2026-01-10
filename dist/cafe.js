import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { lookup } from "mime-types";
import { EventEmitter } from "node:events";
import { createDeferred, createReadStream, getAddressInfo, noop, obj } from "./utils.js";
import { matchesGlob, resolve, sep } from "node:path";
import { check, nonNullable } from "./validate.js";
import { open, stat } from "node:fs/promises";
import { readFile } from "node:fs/promises";
const manifestText = await readFile(resolve(import.meta.dirname, "../package.json"), "utf8");
const manifest = JSON.parse(manifestText);
export const cafeStatusMap = {
    ACQUIRING_FILESYSTEM_HANDLE: [
        2,
        () => "Acquiring file handle...",
        () => "Failed to acquire file handle.",
    ],
    GETTING_HANDLE_STATS: [2, () => "Getting file stats...", () => "Failed to get file stats."],
    VALIDATING_HANDLE_TYPE: [
        2,
        () => "Validating handle type...",
        (type) => `The filesystem handle did not refer to a ${type}.`,
    ],
    VALIDATING_REQUESTED_RANGE: [2, () => "Validating requested range...", () => "Invalid range."],
    SERVING_FILE: [
        2,
        () => "Serving file...",
        (fileName) => `Failed to serve file: ${fileName}`,
    ],
};
const defaultCafeConfig = {
    alias: {},
    basePath: process.cwd(),
    menu: {
        include: ["**/*"],
        exclude: [],
    },
    exposeAPI: false,
    broadcastVersion: true,
    debugResponseHeaders: false,
};
const createConfig = (partialConfig = {}) => {
    const config = obj.merge(defaultCafeConfig, partialConfig);
    config.basePath = resolve(config.basePath);
    config.menu = obj.merge(defaultCafeConfig.menu, partialConfig.menu ?? {});
    return config;
};
const getCafeRelativePath = (cafe, path) => {
    const { basePath } = cafe.config;
    let resourcePath = path;
    resourcePath = resourcePath.slice(resourcePath.startsWith(basePath) ? basePath.length : 0);
    resourcePath = resourcePath.slice(+resourcePath.startsWith(sep));
    return resourcePath;
};
const testMenuPattern = (patterns, path) => {
    let normalizedPath = path.slice(+path.startsWith(sep));
    let matched = false;
    for (let i = 0; i < patterns.length; ++i) {
        const pattern = patterns[i];
        if (check.string(pattern))
            matched = matchesGlob(normalizedPath, pattern);
        if (check.regexp(pattern))
            matched = pattern.test(normalizedPath);
    }
    return matched;
};
const parseRequestedRange = (range, fileSize) => {
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
const notOnMenu = (cafe, c) => {
    c.status(404);
    return c.text("It seems the item you ordered is not on the menu.");
};
const serveMultipart = async (cafe, c, path, ranges) => {
    const boundary = crypto.randomUUID();
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const mimeType = lookup(path) || "application/octet-stream";
    const fileSize = await stat(path)
        .then((s) => s.size)
        .catch(() => {
        c.status(404);
        cafe.config.debugResponseHeaders &&
            c.header("Cafe-Failure-Reason", "Failed to get file stats.");
        return () => c.text("It seems the item you ordered is not on the menu.");
    });
    if (typeof fileSize === "function")
        return fileSize();
    c.status(206);
    c.header("Content-Type", `multipart/byteranges; boundary=${boundary}`);
    let rangeIndex = -1;
    let readIterator = (async function* () {
        yield Buffer.allocUnsafe(0);
    })();
    let started = false;
    const readableStream = new ReadableStream({
        async pull(controller) {
            const { value, done } = await readIterator.next();
            value?.length && controller.enqueue(value);
            if (done) {
                if (started)
                    controller.enqueue(Buffer.from("\r\n"));
                started = true;
                if (++rangeIndex < ranges.length) {
                    const range = nonNullable(ranges[rangeIndex]);
                    controller.enqueue(boundaryBuffer);
                    controller.enqueue(Buffer.from("\r\n"));
                    controller.enqueue(`Content-Type: ${mimeType}\r\n` +
                        `Content-Range: bytes ${range[0]}-${range[0] + range[1] - 1}/${fileSize}\r\n\r\n`);
                    readIterator = createReadStream(path, {
                        offset: range[0],
                        length: range[1],
                    });
                }
                else {
                    controller.enqueue(boundaryBuffer);
                    controller.enqueue(Buffer.from("--\r\n"));
                    controller.close();
                }
            }
        },
        async cancel() {
            await readIterator.return();
        },
    });
    return c.body(readableStream);
};
const serveFile = async (cafe, c, path) => {
    if (!checkServable(cafe, getCafeRelativePath(cafe, path)))
        return notOnMenu(cafe, c);
    let internalStatus = "SERVING_FILE";
    let fileSize = -1;
    c.header("Accept-Ranges", "bytes");
    try {
        internalStatus = "ACQUIRING_FILESYSTEM_HANDLE";
        const handle = await open(path);
        internalStatus = "GETTING_HANDLE_STATS";
        const stats = await handle.stat();
        fileSize = stats.size;
        internalStatus = "VALIDATING_HANDLE_TYPE";
        if (!stats.isFile())
            throw new TypeError("Not a file: " + path);
        const range = c.req.header("Range");
        const ranges = [[0, 0]];
        ranges.pop();
        if (!range)
            ranges.push([0, stats.size]);
        else {
            internalStatus = "VALIDATING_REQUESTED_RANGE";
            const parsedRanges = parseRequestedRange(range, stats.size);
            if (!parsedRanges)
                throw new RangeError(`Invalid range: ${c.req.header("Range")}`);
            ranges.push(...parsedRanges);
        }
        internalStatus = "SERVING_FILE";
        if (ranges.length > 1)
            return serveMultipart(cafe, c, path, ranges);
        let rangeIndex = 0;
        let readIterator = createReadStream(path, {
            offset: nonNullable(ranges[rangeIndex])[0],
            length: nonNullable(ranges[rangeIndex])[1],
        });
        const readableStream = new ReadableStream({
            pull: async (controller) => {
                const iterResult = await readIterator.next();
                controller.enqueue(iterResult.value);
                if (iterResult.done) {
                    if (++rangeIndex < ranges.length)
                        readIterator = createReadStream(path, {
                            offset: nonNullable(ranges[rangeIndex])[0],
                            length: nonNullable(ranges[rangeIndex])[1],
                        });
                    else
                        controller.close();
                }
            },
            cancel: async () => {
                for await (const chunk of readIterator)
                    noop(chunk);
            },
        });
        c.status(range ? 206 : 200);
        c.header("Content-Type", lookup(path) || "application/octet-stream");
        c.header("Content-Length", String(ranges.reduce((acc, range) => acc + range[1], 0)));
        range &&
            c.header("Content-Range", `bytes ${ranges[0][0]}-${ranges[0][0] + ranges[0][1] - 1}/${fileSize}`);
        return c.body(readableStream);
    }
    catch (_error) {
        const error = _error;
        cafe.config.debugResponseHeaders && c.header("Cafe-Failure-Reason", internalStatus);
        switch (internalStatus) {
            case "ACQUIRING_FILESYSTEM_HANDLE":
            case "GETTING_HANDLE_STATS":
            case "VALIDATING_HANDLE_TYPE": {
                if ("code" in error && error.code === "ENOENT") {
                    return notOnMenu(cafe, c);
                }
                else {
                    c.status(500);
                    return c.text("Umm... It seems the café is in disarray at the moment.");
                }
            }
            case "VALIDATING_REQUESTED_RANGE": {
                c.status(416);
                c.header("Content-Range", `bytes */${fileSize - 1}`);
                return c.text("Sorry. The chef doesn't know how to make that.");
            }
            case "SERVING_FILE":
            default: {
                c.status(500);
                return c.text("Umm... It seems the café is in disarray at the moment.");
            }
        }
    }
};
const serveDirectory = async (cafe, c, path) => {
    if (!checkServable(cafe, getCafeRelativePath(cafe, path)))
        return notOnMenu(cafe, c);
    return await serveFile(cafe, c, resolve(path, "index.html"));
};
const checkServable = (cafe, path) => {
    const resolvedPath = resolve(cafe.config.basePath, path);
    const included = testMenuPattern(cafe.config.menu.include, path);
    const excluded = testMenuPattern(cafe.config.menu.exclude, path);
    const isOutsideBasePath = !resolvedPath.startsWith(cafe.config.basePath);
    return included && !excluded && !isOutsideBasePath;
};
const createCafeHonoInstance = (cafe) => {
    const hono = new Hono();
    hono.use((c, next) => {
        c.header("Served-By", "@natsie/cafe");
        cafe.config.broadcastVersion && c.header("Cafe-Version", manifest.version);
        return next();
    });
    hono.get("/_cafe_/", (...args) => {
        return args[0].text("Hello from staff!");
    });
    hono.get("/*", async (c) => {
        const url = new URL(c.req.url, `http://[::1]:${cafe.port}/`);
        const path = url.pathname.slice(+url.pathname.startsWith("/"));
        const resolvedPath = resolve(cafe.config.basePath, path);
        const isServable = checkServable(cafe, path);
        if (!isServable)
            return notOnMenu(cafe, c);
        const handle = await open(resolvedPath).catch(() => null);
        if (!handle)
            return notOnMenu(cafe, c);
        const stats = await handle.stat().catch(() => null);
        if (!stats)
            return notOnMenu(cafe, c);
        if (stats.isFile())
            return await serveFile(cafe, c, resolvedPath);
        if (stats.isDirectory())
            return await serveDirectory(cafe, c, resolvedPath);
        return notOnMenu(cafe, c);
    });
    return hono;
};
class Cafe extends EventEmitter {
    config;
    hono;
    server;
    _port;
    constructor(config = {}) {
        super();
        this.config = createConfig(config);
        this.hono = createCafeHonoInstance(this);
        this.server = serve(this.hono);
        this._port = null;
        this.server.close();
    }
    get port() {
        if (this._port === null)
            throw new Error("The cafe is not open for business... yet.");
        return this._port;
    }
    async listen(port = 3333, options = {}) {
        const { server } = this;
        let retryCount = options.retryCount == null
            ? 2
            : options.retryCount === -1
                ? Number.POSITIVE_INFINITY
                : options.retryCount;
        let retryInterval = options.retryInterval ?? 1000;
        let incremental = options.incremental ?? false;
        // Initial deferred setup
        let deferred = await createDeferred();
        const onlistening = () => deferred.resolve(null);
        const onerror = (error) => deferred.reject(error);
        // Add listeners ONCE. The loop just re-triggers the action.
        // Note: We use 'error', not 'listenError'
        server.addListener("error", onerror);
        server.addListener("listening", onlistening);
        try {
            while (retryCount >= 0 && port < 65536) {
                server.listen(port);
                try {
                    await deferred.promise;
                    this._port = port;
                    this.emit("listening", this, getAddressInfo(this.server));
                    return this;
                }
                catch (error) {
                    if (error.code !== "EADDRINUSE")
                        throw error; // Rethrow unknown errors
                    // Reset deferred for the next attempt
                    deferred = await createDeferred();
                    await new Promise((resolve) => setTimeout(resolve, retryInterval));
                    if (incremental)
                        port++;
                    retryCount--;
                }
            }
        }
        finally {
            // Always clean up listeners
            server.removeListener("error", onerror);
            server.removeListener("listening", onlistening);
        }
        const error = new Error("I'm afraid we couldn't open the cafe today.");
        this.emit("listenError", error, this);
        throw error;
    }
    close() {
        return new Promise((resolve, reject) => {
            this.server.close((error) => (error ? reject(error) : resolve(((this._port = null), this))));
        });
    }
}
export { Cafe };
//# sourceMappingURL=cafe.js.map