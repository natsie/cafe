import type { LoggerInterfaceOptions, LoggerConfig, LogWriter } from "./types/logger.d.ts";
declare class Logger {
    config: LoggerConfig;
    interfaces: Map<string, {
        active: boolean;
        writer: LogWriter;
    }>;
    constructor(config?: Partial<LoggerConfig>);
    addInterface(name: string, writer: LogWriter): Logger;
    removeInterface(name: string): Logger;
    enableInterface(name: string): Logger;
    disableInterface(name: string): Logger;
    handleLog(type: string, data: unknown[]): null;
    log(...data: unknown[]): void;
    info(...data: unknown[]): void;
    warn(...data: unknown[]): void;
    error(...data: unknown[]): void;
    logCustom(type: string, ...data: unknown[]): void;
}
declare const createConsoleWriter: (options: LoggerInterfaceOptions) => LogWriter;
declare const createFileWriter: (filename: string, options?: LoggerInterfaceOptions) => Promise<LogWriter & {
    close: () => Promise<void>;
}>;
export { Logger, createConsoleWriter, createFileWriter as createLogFileWriter };
//# sourceMappingURL=logger.d.ts.map