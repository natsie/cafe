import { serve, type ServerType } from "@hono/node-server";
import { object } from "broadutils/data";
import { createDeferred, noop } from "broadutils/misc";
import { check, nonNullable } from "broadutils/validate";
import { Hono, type Context } from "hono";
import EventEmitter from "node:events";
import { access, stat } from "node:fs/promises";
import { extname, matchesGlob, resolve, sep } from "node:path";
import type * as ICafe from "./types/cafe.d.ts";
import { createReadStream, parseRangeHeader, readJSONFromFile } from "./utils.ts";
import { lookup } from "mime-types";

const manifest: typeof import("../package.json") = await readJSONFromFile(
  resolve(import.meta.dirname, "../package.json"),
);

const defaultCafeConfig: ICafe.Config = {
  alias: {},
  basePath: process.cwd(),
  menu: {
    include: ["**/*"],
    exclude: [],
  },
  exposeAPI: false,
  broadcastVersion: true,
};

const createConfig = (partialConfig: ICafe.PartialConfig = {}): ICafe.Config => {
  const config = object.merge(defaultCafeConfig, partialConfig);
  config.basePath = resolve(config.basePath);
  config.menu = object.merge(defaultCafeConfig.menu, partialConfig.menu ?? {});
  return config;
};

const testMenuPattern = (patterns: ICafe.MenuPattern[], path: string): boolean => {
  let normalizedPath = path.slice(+path.startsWith(sep));
  let matched = false;
  for (let i = 0; i < patterns.length; ++i) {
    const pattern = patterns[i];
    if (check.string(pattern)) matched = matchesGlob(normalizedPath, pattern);
    if (check.regexp(pattern)) matched = pattern.test(normalizedPath);
  }

  return matched;
};

const checkServable = (cafe: Cafe, path: string) => {
  const resolvedPath = resolve(cafe.config.basePath, path);
  const included = testMenuPattern(cafe.config.menu.include, path);
  const excluded = testMenuPattern(cafe.config.menu.exclude, path);
  const isOutsideBasePath = !resolvedPath.startsWith(cafe.config.basePath);

  return included && !excluded && !isOutsideBasePath;
};

const serveFile = async (
  instance: Cafe,
  context: Context,
  resolvedPath: string,
): Promise<Response> => {
  try {
    const stats = await stat(resolvedPath);
    const mimeType = lookup(extname(resolvedPath)) || "application/octet-stream";
    const range = context.req.header("Content-Range");
    const ranges: [[number, number], ...[number, number][]] = [[0, 0]];
    ranges.pop();

    if (!range) ranges.push([0, stats.size]);
    else {
      const parsedRanges = parseRangeHeader(range, stats.size);
      if (!parsedRanges) throw new RangeError(`Invalid range: ${range}`);
      ranges.push(...parsedRanges);
    }

    if (ranges.length > 1) {
      context.header("Content-Range", `*/${stats.size}`);
      return context.text("", 416);
    }

    let rangeIndex = 0;
    let readIterator = createReadStream(resolvedPath, {
      offset: nonNullable(ranges[rangeIndex])[0],
      length: nonNullable(ranges[rangeIndex])[1],
    });
    const readableStream = new ReadableStream({
      pull: async (controller) => {
        const iterResult = await readIterator.next();
        controller.enqueue(iterResult.value);
        if (iterResult.done) {
          readIterator.return();
          if (++rangeIndex < ranges.length)
            readIterator = createReadStream(resolvedPath, {
              offset: nonNullable(ranges[rangeIndex])[0],
              length: nonNullable(ranges[rangeIndex])[1],
            });
          else controller.close();
        }
      },
      cancel: async () => {
        readIterator.return();
      },
    });

    context.status(range ? 206 : 200);
    context.header("Content-Type", mimeType);
    context.header("Content-Length", String(ranges[0][1]));
    range &&
      context.header(
        "Content-Range",
        `bytes ${ranges[0][0]}-${ranges[0][0] + ranges[0][1] - 1}/${stats.size}`,
      );

    return context.body(readableStream);
  } catch (_error) {
    const error = _error as Error;

    if ("code" in error && error.code === "ENOENT") {
      return context.notFound();
    } else {
      context.status(500);
      return context.text("There seems to be some chaos at the café.");
    }
  }
};

const serveDirectory = async (
  instance: Cafe,
  context: Context,
  resolvedPath: string,
): Promise<Response> => {
  const indexFilePath = resolve(resolvedPath, "index.html");
  return access(indexFilePath)
    .then(() => serveFile(instance, context, indexFilePath))
    .catch(() => context.notFound());
};

const createCafeHonoInstance = (cafe: Cafe): Hono => {
  const hono = new Hono();
  hono.use((c, next) => {
    c.header("Served-By", "@natsie/cafe");
    cafe.config.broadcastVersion && c.header("Cafe-Version", manifest.version);
    return next();
  });

  for (const [key, value] of Object.entries(cafe.config.alias)) {
    hono.get(key, async (context) => {
      return context.redirect(value);
    });
  }

  hono.get("/*", async (context) => {
    const url = new URL(context.req.url, `http://[::1]:${cafe.port}/`);
    const path = url.pathname.slice(+url.pathname.startsWith("/"));
    const resolvedPath = resolve(cafe.config.basePath, path);
    const isServable = checkServable(cafe, path);
    if (!isServable) return context.notFound();

    const stats = await stat(resolvedPath).catch(() => null);
    if (!stats) return context.notFound();

    if (stats.isFile()) return await serveFile(cafe, context, resolvedPath);
    if (stats.isDirectory()) return await serveDirectory(cafe, context, resolvedPath);
    return context.notFound();
  });
  return hono;
};

class Cafe extends EventEmitter<ICafe.EventMap> {
  config: ICafe.Config;
  private hono: Hono;
  private server: ServerType;
  private _port: number | null;

  constructor(config: ICafe.PartialConfig = {}) {
    super();
    this.config = createConfig(config);
    this.hono = createCafeHonoInstance(this);
    this.server = serve(this.hono);
    this._port = null;

    this.server.close();
  }

  get port(): number {
    if (this._port === null) throw new Error("The cafe is not open for business... yet.");
    return this._port;
  }

  async listen(port: number = 3333, options: ICafe.ListenOptions = {}): Promise<Cafe> {
    const { server } = this;

    let retryCount =
      options.retryCount == null
        ? 2
        : options.retryCount === -1
          ? Number.POSITIVE_INFINITY
          : options.retryCount;
    let retryInterval = options.retryInterval ?? 1000;
    let incremental = options.incremental ?? false;

    let deferred = await createDeferred<null>();

    const onlistening = () => deferred.resolve(null);
    const onerror = (error: Error) => deferred.reject(error);

    server.addListener("error", onerror);
    server.addListener("listening", onlistening);

    try {
      while (retryCount >= 0 && port < 65536) {
        server.listen(port);

        try {
          await deferred.promise;
          this._port = port;
          this.emit("listening", this, this.server.address() || "<unknown>");
          return this;
        } catch (error: any) {
          if (error.code !== "EADDRINUSE") throw error;

          deferred = await createDeferred<null>();

          await new Promise((resolve) => setTimeout(resolve, retryInterval));
          if (incremental) port++;
          retryCount--;
        }
      }
    } finally {
      server.removeListener("error", onerror);
      server.removeListener("listening", onlistening);
    }

    const error = new Error("I'm afraid we couldn't open the cafe today.");
    this.emit("listenError", error, this);
    throw error;
  }

  close(): Promise<Cafe> {
    return new Promise((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve(((this._port = null), this))));
    });
  }
}

export { Cafe };
