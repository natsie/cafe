import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { writeFile, rm, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Cafe } from "../cafe.ts";
import type { PartialConfig } from "../types/cafe.d.ts";

const tempDir = resolve("./temp_cafe_test");
const testFile = "test.txt";
const testContent = "Hello Cafe World";

describe("Café Server", () => {
  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, testFile), testContent);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const startCafe = async (config: PartialConfig = {}) => {
    const cafe = new Cafe({
      basePath: tempDir,
      ...config,
    });

    const randomPort = 4000 + Math.floor(Math.random() * 10000);
    await cafe.listen(randomPort, { retryCount: 5, incremental: true });
    return cafe;
  };

  const stopCafe = async (cafe: Cafe) => {
    // Access private server to close it
    await cafe.close();
  };

  it("should serve a file on the menu", async () => {
    const cafe = await startCafe({
      menu: { include: ["**/*"] },
    });
    const url = `http://localhost:${cafe.port}/${testFile}`;
    const response = await fetch(url);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(testContent);
    // The lookup function from mime-types returns text/plain for .txt
    const contentType = response.headers.get("Content-Type") || "";
    expect(contentType).toSatisfy((ct) => ct.startsWith("text/plain"));

    await stopCafe(cafe);
  });

  it("should return 404 for file not on menu", async () => {
    const cafe = await startCafe({
      menu: { include: ["*.json"] }, // Only json
    });
    const url = `http://localhost:${cafe.port}/${testFile}`;
    const response = await fetch(url);

    expect(response.status).toBe(404);
    expect(await response.text()).toContain("not on the menu");

    await stopCafe(cafe);
  });

  it("should return 404 for non-existent file", async () => {
    const cafe = await startCafe();
    const url = `http://localhost:${cafe.port}/non_existent.txt`;
    const response = await fetch(url);

    expect(response.status).toBe(404);

    await stopCafe(cafe);
  });

  it("should support Range headers", async () => {
    const cafe = await startCafe();
    const url = `http://localhost:${cafe.port}/${testFile}`;

    // Request first 5 bytes: "Hello"
    const response = await fetch(url, {
      headers: { Range: "bytes=0-4" },
    });

    expect(response.status).toBe(206);
    expect(await response.text()).toBe("Hello");
    expect(response.headers.get("Content-Length")).toBe("5");
    expect(response.headers.get("Content-Range")).toContain("bytes 0-4/");

    await stopCafe(cafe);
  });

  it("should support Multipart Range headers", async () => {
    const cafe = await startCafe();
    const url = `http://localhost:${cafe.port}/${testFile}`;

    // Request "Hello" (0-4) and "World" (11-15)
    // "Hello Cafe World"
    //  0123456789012345
    // Hello: 0-4
    // World: 11-15
    const response = await fetch(url, {
      headers: { Range: "bytes=0-4, 11-15" },
    });

    expect(response.status).toBe(206);
    const contentType = response.headers.get("Content-Type");
    expect(contentType).toContain("multipart/byteranges");

    const text = await response.text();
    expect(text).toContain("Hello");
    expect(text).toContain("World");

    // Check for boundary structure
    const boundary = contentType?.split("boundary=")[1];
    expect(text).toContain(`--${boundary}`);

    await stopCafe(cafe);
  });

  it("should prevent path traversal", async () => {
    const cafe = await startCafe();
    // Attempt to access parent directory
    const url = `http://localhost:${cafe.port}/../package.json`;
    const response = await fetch(url);

    // Should be 404 "not on menu" or effectively blocked
    expect(response.status).toBe(404);

    await stopCafe(cafe);
  });
});
