import { inspect } from "node:util";
import { open, writeFile, type FileHandle } from "node:fs/promises";
import type {
  ConsoleLogType,
  LoggerInterfaceOptions,
  Log,
  LoggerConfig,
  LogWriter,
} from "./types/logger.d.ts";
import { nonNullable } from "./validate.ts";
import { str } from "./utils.ts";

const defaultConfig = (): LoggerConfig => ({
  name: crypto.randomUUID(),
  inspectOptions: { colors: true },
});

class Logger {
  config: LoggerConfig;
  interfaces: Map<string, { active: boolean; writer: LogWriter }>;
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = defaultConfig();
    this.interfaces = new Map();

    this.config.name = config.name ?? this.config.name;
    this.config.inspectOptions = config.inspectOptions ?? this.config.inspectOptions;
  }

  addInterface(name: string, writer: LogWriter): Logger {
    this.interfaces.set(name, { active: true, writer });
    return this;
  }
  removeInterface(name: string): Logger {
    this.interfaces.delete(name);
    return this;
  }
  enableInterface(name: string): Logger {
    const _interface = nonNullable(this.interfaces.get(name));
    _interface.active = true;
    return this;
  }
  disableInterface(name: string): Logger {
    const _interface = nonNullable(this.interfaces.get(name));
    _interface.active = false;
    return this;
  }
  handleLog(type: string, data: unknown[]): null {
    const log: Log = {
      type,
      data,
      logString: data.map((item) => inspect(item, this.config.inspectOptions)).join("\n"),
      timestamp: performance.timeOrigin + performance.now(),
    };
    for (const [name, _interface] of this.interfaces) {
      try {
        _interface.active && _interface.writer(this, log);
      } catch (error) {
        console.error(`The writer for interface ${name} failed to handle a log.`, error);
      }
    }
    return null;
  }

  log(...data: unknown[]) {
    this.handleLog("log", data);
  }
  info(...data: unknown[]) {
    this.handleLog("info", data);
  }
  warn(...data: unknown[]) {
    this.handleLog("warn", data);
  }
  error(...data: unknown[]) {
    this.handleLog("error", data);
  }
  logCustom(type: string, ...data: unknown[]) {
    this.handleLog(type, data);
  }
}

const consoleLogTypes: Set<ConsoleLogType> = new Set(["log", "info", "warn", "error"]);
const dayOfWeek: [string, string][] = [
  ["Sunday", "Sun"],
  ["Monday", "Mon"],
  ["Tuesday", "Tue"],
  ["Wednesday", "Wed"],
  ["Thursday", "Thu"],
  ["Friday", "Fri"],
  ["Saturday", "Sat"],
];

const dataMapper = (logger: Logger, item: unknown) => {
  if (typeof item === "string") return item;
  return inspect(item, { ...logger.config.inspectOptions, colors: false });
};

const formatLog = (logger: Logger, log: Log, template: string = "{{processed_data}}"): string => {
  const logString = log.data.map((item) => dataMapper(logger, item)).join("\n");
  const logDate = new Date(log.timestamp);
  const isoString = logDate.toISOString();
  const [fullDate, fullTime] = isoString.slice(0, -1).split("T") as [string, string];
  return str.substitute(template, {
    "{{log_type}}": log.type,
    "{{processed_data}}": logString,
    "{{timestamp}}": String(Math.floor(log.timestamp)),
    "{{timestamp_precise}}": String(log.timestamp),
    "{{iso_date}}": isoString,
    "{{date}}": fullDate,
    "{{time}}": fullTime,
    "{{JJ}}": (dayOfWeek[logDate.getDay()] as [string, string])[0].toUpperCase(),
    "{{jj}}": (dayOfWeek[logDate.getDay()] as [string, string])[0],
    "{{J}}": (dayOfWeek[logDate.getDay()] as [string, string])[1].toUpperCase(),
    "{{j}}": (dayOfWeek[logDate.getDay()] as [string, string])[1],
    "{{YYYY}}": logDate.getFullYear().toString(),
    "{{YY}}": logDate.getFullYear().toString().slice(-2),
    "{{MM}}": logDate.getMonth().toString().padStart(2, "0"),
    "{{M}}": logDate.getMonth().toString(),
    "{{dd}}": logDate.getDate().toString().padStart(2, "0"),
    "{{HH}}": logDate.getHours().toString().padStart(2, "0"),
    "{{hh}}": (logDate.getHours() % 12).toString().padStart(2, "0"),
    "{{mm}}": logDate.getMinutes().toString().padStart(2, "0"),
    "{{ss}}": logDate.getSeconds().toString().padStart(2, "0"),
    "{{H}}": logDate.getHours().toString(),
    "{{h}}": (logDate.getHours() % 12).toString(),
    "{{m}}": logDate.getMinutes().toString(),
    "{{s}}": logDate.getSeconds().toString(),
    "{{ms++}}": logDate.getMilliseconds().toString().padStart(3, "0"),
    "{{ms+}}": logDate.getMilliseconds().toString().padStart(2, "0"),
    "{{ms}}": logDate.getMilliseconds().toString(),
    "{{PP}}": logDate.getHours() >= 12 ? "PM" : "AM",
    "{{pp}}": logDate.getHours() >= 12 ? "pm" : "am",
    "{{P}}": logDate.getHours() >= 12 ? "P" : "M",
    "{{p}}": logDate.getHours() >= 12 ? "p" : "m",
  });
};

const createConsoleWriter = (options: LoggerInterfaceOptions): LogWriter => {
  return (_logger, log) => {
    if (consoleLogTypes.has(log.type as ConsoleLogType)) {
      console[log.type as ConsoleLogType](formatLog(_logger, log, options.template));
    } else console.log(formatLog(_logger, log, options.template));
  };
};

const createFileWriter = async (
  filename: string,
  options: LoggerInterfaceOptions = {},
): Promise<LogWriter & { close: () => Promise<void> }> => {
  const handle: FileHandle = await open(filename, "a");
  const logQueue: Log[] = [];

  const _options = {
    template: options.template ?? "{{processed_data}}",
    clearPreviousLogs: options.clearPreviousLogs ?? false,
  };

  let writeAvailable = true;
  const drainLogQueue = async (logger: Logger) => {
    writeAvailable = false;
    while (logQueue.length > 0) {
      const log = logQueue.shift();
      if (!log) continue;

      await handle
        .write(formatLog(logger, log, _options.template) + "\n")
        .catch((error) => {
          console.error(`An error occurred while writing to the log file.`, { logger, log, error });
          return null;
        })
        .finally(() => (writeAvailable = true));
    }
  };

  if (_options.clearPreviousLogs) {
    await writeFile(filename, "").catch((error) => {
      console.error(`An error occurred while clearing the log file.`, { error });
    });
  }

  const writer: LogWriter & { close: () => Promise<void> } = (logger, log) => {
    logQueue.push(log);
    if (writeAvailable) {
      drainLogQueue(logger);
    }
  };
  writer.close = async () => {
    await handle.close();
  };
  return writer;
};

export { Logger, createConsoleWriter, createFileWriter as createLogFileWriter };
