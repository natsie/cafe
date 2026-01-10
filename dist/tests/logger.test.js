import { describe, expect, it, mock, spyOn, beforeAll, afterAll, beforeEach } from "bun:test";
import { rm, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Logger, createConsoleWriter, createLogFileWriter } from "../logger.js";
describe("Logger", () => {
    it("should initialize with a default config", () => {
        const logger = new Logger();
        expect(logger.config.name).toBeString();
        expect(logger.config.inspectOptions).toEqual({ colors: true });
    });
    it("should initialize with a partial custom config", () => {
        const logger = new Logger({ name: "test-logger" });
        expect(logger.config.name).toBe("test-logger");
        expect(logger.config.inspectOptions).toEqual({ colors: true });
    });
    it("should add and remove an interface", () => {
        const logger = new Logger();
        const mockWriter = () => { };
        logger.addInterface("test", mockWriter);
        expect(logger.interfaces.has("test")).toBe(true);
        logger.removeInterface("test");
        expect(logger.interfaces.has("test")).toBe(false);
    });
    it("should enable and disable an interface", () => {
        const logger = new Logger();
        const mockWriter = () => { };
        logger.addInterface("test", mockWriter);
        const iface = logger.interfaces.get("test");
        expect(iface?.active).toBe(true);
        logger.disableInterface("test");
        expect(iface?.active).toBe(false);
        logger.enableInterface("test");
        expect(iface?.active).toBe(true);
    });
    it("should call the writer of an active interface", () => {
        const logger = new Logger();
        const writer = mock((l, log) => { });
        logger.addInterface("test", writer);
        logger.log("test message");
        expect(writer).toHaveBeenCalledTimes(1);
        expect(writer).toHaveBeenCalledWith(logger, expect.objectContaining({ type: "log", data: ["test message"] }));
    });
    it("should not call the writer of an inactive interface", () => {
        const logger = new Logger();
        const writer = mock((l, log) => { });
        logger.addInterface("test", writer);
        logger.disableInterface("test");
        logger.log("test message");
        expect(writer).not.toHaveBeenCalled();
    });
    it("should call handleLog with correct type for log, info, warn, and error", () => {
        const logger = new Logger();
        const handleLogSpy = spyOn(logger, "handleLog");
        logger.log("log message");
        expect(handleLogSpy).toHaveBeenCalledWith("log", ["log message"]);
        logger.info("info message");
        expect(handleLogSpy).toHaveBeenCalledWith("info", ["info message"]);
        logger.warn("warn message");
        expect(handleLogSpy).toHaveBeenCalledWith("warn", ["warn message"]);
        logger.error("error message");
        expect(handleLogSpy).toHaveBeenCalledWith("error", ["error message"]);
        logger.logCustom("custom", "custom message");
        expect(handleLogSpy).toHaveBeenCalledWith("custom", ["custom message"]);
        handleLogSpy.mockRestore();
    });
    it("should handle multiple interfaces", () => {
        const logger = new Logger();
        const writer1 = mock(() => { });
        const writer2 = mock(() => { });
        logger.addInterface("writer1", writer1);
        logger.addInterface("writer2", writer2);
        logger.log("test");
        expect(writer1).toHaveBeenCalledTimes(1);
        expect(writer2).toHaveBeenCalledTimes(1);
    });
    it("should not fail if one writer throws an error", () => {
        const logger = new Logger();
        const errorWriter = mock(() => {
            throw new Error("Writer failed");
        });
        const goodWriter = mock(() => { });
        const errorSpy = spyOn(console, "error").mockImplementation(() => { });
        logger.addInterface("errorWriter", errorWriter);
        logger.addInterface("goodWriter", goodWriter);
        logger.log("test message");
        expect(errorWriter).toHaveBeenCalledTimes(1);
        expect(goodWriter).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
    describe("createConsoleWriter", () => {
        it("should call console.log for 'log' type", () => {
            const logger = new Logger();
            const consoleWriter = createConsoleWriter({ template: "{{processed_data}}" });
            const logSpy = spyOn(console, "log").mockImplementation(() => { });
            logger.addInterface("console", consoleWriter);
            logger.log("test log");
            expect(logSpy).toHaveBeenCalledWith("test log");
            logSpy.mockRestore();
        });
        it("should call console.info for 'info' type", () => {
            const logger = new Logger();
            const consoleWriter = createConsoleWriter({ template: "{{processed_data}}" });
            const infoSpy = spyOn(console, "info").mockImplementation(() => { });
            logger.addInterface("console", consoleWriter);
            logger.info("test info");
            expect(infoSpy).toHaveBeenCalledWith("test info");
            infoSpy.mockRestore();
        });
        it("should call console.warn for 'warn' type", () => {
            const logger = new Logger();
            const consoleWriter = createConsoleWriter({ template: "{{processed_data}}" });
            const warnSpy = spyOn(console, "warn").mockImplementation(() => { });
            logger.addInterface("console", consoleWriter);
            logger.warn("test warn");
            expect(warnSpy).toHaveBeenCalledWith("test warn");
            warnSpy.mockRestore();
        });
        it("should call console.error for 'error' type", () => {
            const logger = new Logger();
            const consoleWriter = createConsoleWriter({ template: "{{processed_data}}" });
            const errorSpy = spyOn(console, "error").mockImplementation(() => { });
            logger.addInterface("console", consoleWriter);
            logger.error("test error");
            expect(errorSpy).toHaveBeenCalledWith("test error");
            errorSpy.mockRestore();
        });
        it("should call console.log for custom types", () => {
            const logger = new Logger({ inspectOptions: { colors: false } });
            const consoleWriter = createConsoleWriter({ template: "{{processed_data}}" });
            const logSpy = spyOn(console, "log").mockImplementation(() => { });
            const customData = { message: "custom message" };
            logger.addInterface("console", consoleWriter);
            logger.logCustom("custom_type", customData);
            expect(logSpy).toHaveBeenCalledWith("{ message: 'custom message' }");
            logSpy.mockRestore();
        });
        it("should format logs using the provided template", () => {
            const logger = new Logger();
            const consoleWriter = createConsoleWriter({ template: "[{{log_type}}] {{processed_data}}" });
            const logSpy = spyOn(console, "log").mockImplementation(() => { });
            logger.addInterface("console", consoleWriter);
            logger.log("testing template");
            expect(logSpy).toHaveBeenCalledWith("[log] testing template");
            logSpy.mockRestore();
        });
    });
    describe("createLogFileWriter", () => {
        const tempLogDir = "./temp_logs_for_testing";
        const logFile = join(tempLogDir, "test.log");
        beforeAll(async () => {
            await mkdir(tempLogDir, { recursive: true });
        });
        afterAll(async () => {
            await rm(tempLogDir, { recursive: true, force: true });
        });
        beforeEach(async () => {
            try {
                await rm(logFile);
            }
            catch (e) {
                // ignore if file does not exist
            }
        });
        it("should create a file and write a log to it", async () => {
            const logger = new Logger();
            const fileWriter = await createLogFileWriter(logFile, { template: "{{processed_data}}" });
            logger.addInterface("file", fileWriter);
            logger.log("hello file");
            // Give it a moment to write
            await new Promise((resolve) => setTimeout(resolve, 50));
            await fileWriter.close();
            const content = await readFile(logFile, "utf-8");
            expect(content.trim()).toBe("hello file");
        });
        it("should clear previous logs if option is set", async () => {
            await import("node:fs/promises").then((fs) => fs.writeFile(logFile, "old data"));
            const logger = new Logger();
            const fileWriter = await createLogFileWriter(logFile, {
                clearPreviousLogs: true,
                template: "{{processed_data}}",
            });
            logger.addInterface("file", fileWriter);
            logger.log("new data");
            // Give it a moment to write
            await new Promise((resolve) => setTimeout(resolve, 50));
            await fileWriter.close();
            const content = await readFile(logFile, "utf-8");
            expect(content.trim()).toBe("new data");
            expect(content.includes("old data")).toBe(false);
        });
        it("should handle multiple fast logs correctly", async () => {
            const logger = new Logger();
            const fileWriter = await createLogFileWriter(logFile, { template: "{{processed_data}}" });
            logger.addInterface("file", fileWriter);
            const logCount = 50;
            for (let i = 1; i <= logCount; i++) {
                logger.log(`Log entry ${i}`);
            }
            // Give it a moment to write all queued logs
            await new Promise((resolve) => setTimeout(resolve, 200));
            await fileWriter.close();
            const content = await readFile(logFile, "utf-8");
            const lines = content.trim().split("\n");
            expect(lines.length).toBe(logCount);
            expect(lines[0]).toBe("Log entry 1");
            expect(lines[logCount - 1]).toBe(`Log entry ${logCount}`);
        });
        it("should correctly format logs using the template", async () => {
            const logger = new Logger();
            const fileWriter = await createLogFileWriter(logFile, {
                template: "[{{log_type}}] {{processed_data}}",
            });
            logger.addInterface("file", fileWriter);
            logger.log("test info");
            // Give it a moment to write
            await new Promise((resolve) => setTimeout(resolve, 50));
            await fileWriter.close();
            const content = await readFile(logFile, "utf-8");
            expect(content.trim()).toBe("[log] test info");
        });
        it("should handle different template variables", async () => {
            const logger = new Logger();
            const template = "{{YYYY}}-{{MM}}-{{dd}} {{HH}}:{{mm}}:{{ss}} - {{processed_data}}";
            const fileWriter = await createLogFileWriter(logFile, { template });
            logger.addInterface("file", fileWriter);
            logger.log("timed log");
            await new Promise((resolve) => setTimeout(resolve, 50));
            await fileWriter.close();
            const content = await readFile(logFile, "utf-8");
            // Regex to match the date format, as the exact time will vary
            const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - timed log$/;
            expect(content.trim()).toMatch(dateRegex);
        });
    });
});
//# sourceMappingURL=logger.test.js.map