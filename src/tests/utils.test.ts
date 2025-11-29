import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { writeFile, rm } from "node:fs/promises";
import { createReadStream, createDeferred, obj, str, numberToBytes, bytesToNumber, readJSONFromFile } from "../utils.ts";

describe("Utilities", () => {
  describe("createReadStream", () => {
    const testFilePath = "./temp_stream_test_file.txt";
    const testFileContent = "0123456789abcdefghijklmnopqrstuvwxyz";

    beforeAll(async () => {
      await writeFile(testFilePath, testFileContent);
    });

    afterAll(async () => {
      await rm(testFilePath, { force: true });
    });

    it("should read the entire file in chunks", async () => {
      let content = "";
      for await (const chunk of createReadStream(testFilePath)) {
        content += chunk.toString();
      }
      expect(content).toBe(testFileContent);
    });

    it("should read a slice of the file with offset and length", async () => {
      let content = "";
      const options = { offset: 10, length: 10 };
      for await (const chunk of createReadStream(testFilePath, options)) {
        content += chunk.toString();
      }
      expect(content).toBe(testFileContent.slice(options.offset, options.offset + options.length));
    });

    it("should respect the chunkSize option", async () => {
      const chunkSize = 8;
      const chunks: string[] = [];
      for await (const chunk of createReadStream(testFilePath, { chunkSize })) {
        chunks.push(chunk.toString());
      }
      expect(chunks.length).toBe(Math.ceil(testFileContent.length / chunkSize));
      expect(chunks[0]?.length).toBe(chunkSize);
      expect(chunks.join("")).toBe(testFileContent);
    });

    it("should handle reading an empty file", async () => {
      const emptyFilePath = "./empty_test_file.txt";
      await writeFile(emptyFilePath, "");
      let content = "";
      for await (const chunk of createReadStream(emptyFilePath)) {
        content += chunk.toString();
      }
      await rm(emptyFilePath);
      expect(content).toBe("");
    });

    it("should throw an error for a non-existent file", async () => {
      const stream = createReadStream("non-existent-file.txt");
      await expect(stream.next()).rejects.toThrow();
    });
  });

  describe("createDeferred", () => {
    it("should return an object with promise, resolve, and reject properties", async () => {
      const deferred = await createDeferred();
      expect(deferred).toHaveProperty("promise");
      expect(deferred).toHaveProperty("resolve");
      expect(deferred).toHaveProperty("reject");
      expect(deferred.promise).toBeInstanceOf(Promise);
      expect(deferred.resolve).toBeInstanceOf(Function);
      expect(deferred.reject).toBeInstanceOf(Function);
    });

    it("should resolve the promise with the provided value", async () => {
      const deferred = await createDeferred<string>();
      const testValue = "it worked";
      deferred.resolve(testValue);
      const result = await deferred.promise;
      expect(result).toBe(testValue);
    });

    it("should reject the promise with the provided reason", async () => {
      const deferred = await createDeferred<any>();
      const testError = new Error("it failed");
      deferred.reject(testError);
      await expect(deferred.promise).rejects.toThrow(testError);
    });
  });

  describe("obj", () => {
    const sourceObj = { a: 1, b: "two", c: true, d: { nested: true } };

    describe("omit", () => {
      it("should omit a single key from an object", () => {
        const result = obj.omit(sourceObj, ["a"]);
        expect(result).toEqual({ b: "two", c: true, d: { nested: true } });
        expect(result).not.toHaveProperty("a");
      });

      it("should omit multiple keys from an object", () => {
        const result = obj.omit(sourceObj, ["b", "c"]);
        expect(result).toEqual({ a: 1, d: { nested: true } });
        expect(result).not.toHaveProperty("b");
        expect(result).not.toHaveProperty("c");
      });

      it("should return an identical object if no keys are omitted", () => {
        const result = obj.omit(sourceObj, []);
        expect(result).toEqual(sourceObj);
      });

      it("should return an empty object if all keys are omitted", () => {
        const result = obj.omit(sourceObj, ["a", "b", "c", "d"]);
        expect(result).toEqual({});
      });

      it("should handle non-existent keys gracefully", () => {
        const result = obj.omit(sourceObj, ["e" as "a"]);
        expect(result).toEqual(sourceObj);
      });

      it("should return an empty object when omitting from an empty object", () => {
        const result = obj.omit({}, ["a" as never]);
        expect(result).toEqual({});
      });
    });

    describe("pick", () => {
      it("should pick a single key from an object", () => {
        const result = obj.pick(sourceObj, ["a"]);
        expect(result).toEqual({ a: 1 });
      });

      it("should pick multiple keys from an object", () => {
        const result = obj.pick(sourceObj, ["b", "d"]);
        expect(result).toEqual({ b: "two", d: { nested: true } });
      });

      it("should return an empty object if no keys are picked", () => {
        const result = obj.pick(sourceObj, []);
        expect(result).toEqual({});
      });

      it("should return the full object if all keys are picked", () => {
        const result = obj.pick(sourceObj, ["a", "b", "c", "d"]);
        expect(result).toEqual(sourceObj);
      });

      it("should handle non-existent keys by assigning undefined", () => {
        const result = obj.pick(sourceObj, ["a", "e" as "a"]);
        expect(result).toEqual({ a: 1, e: undefined } as { a: typeof sourceObj.a; e: undefined });
        expect("e" in result).toBe(true);
      });

      it("should return an empty object when picking from an empty object", () => {
        const result = obj.pick({}, ["a" as never]);
        expect(result).toEqual({ a: undefined });
      });
    });

    describe("merge", () => {
      it("should merge multiple objects into a new object", () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { c: 3, d: 4 };
        const obj3 = { e: 5 };
        const result = obj.merge(obj1, obj2, obj3);
        expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5 });
        expect(result).not.toBe(obj1);
        expect(result).not.toBe(obj2);
        expect(result).not.toBe(obj3);
      });

      it("should handle overlapping keys, with later objects overriding earlier ones", () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { b: 3, c: 4 };
        const result = obj.merge(obj1, obj2);
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
      });

      it("should return an empty object if no sources are provided", () => {
        const result = obj.merge();
        expect(result).toEqual({});
      });

      it("should handle merging with an empty object", () => {
        const obj1 = { a: 1 };
        const obj2 = {};
        const result = obj.merge(obj1, obj2);
        expect(result).toEqual({ a: 1 });
      });

      it("should perform a shallow merge", () => {
        const obj1 = { a: { nested: 1 } };
        const obj2 = { b: 2 };
        const result = obj.merge(obj1, obj2);
        expect(result.a).toBe(obj1.a);
      });
    });

    describe("mergeInto", () => {
      it("should merge multiple objects into the target object", () => {
        const target = { a: 1, b: 2 };
        const obj1 = { c: 3, d: 4 };
        const obj2 = { e: 5 };
        const result = obj.mergeInto(target, obj1, obj2);
        expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5 });
        expect(result).toBe(target as typeof result); // Should modify target in place
      });

      it("should handle overlapping keys, with later objects overriding earlier ones in the target", () => {
        const target = { a: 1, b: 2 };
        const obj1 = { b: 3, c: 4 };
        const result = obj.mergeInto(target, obj1);
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
        expect(result).toBe(target as typeof result);
      });

      it("should handle merging with an empty source object", () => {
        const target = { a: 1 };
        const obj1 = {};
        const result = obj.mergeInto(target, obj1);
        expect(result).toEqual({ a: 1 });
        expect(result).toBe(target);
      });

      it("should perform a shallow merge into the target", () => {
        const target = { a: { nested: 1 } };
        const obj1 = { b: 2 };
        const result = obj.mergeInto(target, obj1);
        expect(result.a).toBe(target.a);
      });

      it("should return the target object even if no source objects are provided (beyond the target itself)", () => {
        const target = { a: 1 };
        const result = obj.mergeInto(target);
        expect(result).toEqual({ a: 1 });
        expect(result).toBe(target);
      });
    });
  });

  describe("str", () => {
    describe("substitute", () => {
      it("should perform substitutions using a Record object", () => {
        const input = "Hello, {{name}}! Welcome to {{place}}.";
        const substitutions = { "{{name}}": "world", "{{place}}": "the test suite" };
        const result = str.substitute(input, substitutions);
        expect(result).toBe("Hello, world! Welcome to the test suite.");
      });

      it("should perform substitutions using a Map", () => {
        const input = "The quick brown [animal] jumps over the lazy [animal2].";
        const substitutions = new Map<string, string>([
          ["[animal]", "fox"],
          ["[animal2]", "dog"],
        ]);
        const result = str.substitute(input, substitutions);
        expect(result).toBe("The quick brown fox jumps over the lazy dog.");
      });

      it("should handle multiple replacements of the same key", () => {
        const input = "key key key";
        const result = str.substitute(input, { key: "value" });
        expect(result).toBe("value value value");
      });

      it("should return the original string if no substitutions match", () => {
        const input = "No changes here.";
        const result = str.substitute(input, { "{{missing}}": "value" });
        expect(result).toBe(input);
      });

      it("should handle an empty input string", () => {
        const result = str.substitute("", { a: "b" });
        expect(result).toBe("");
      });

      it("should handle an empty substitution map", () => {
        const input = "This should not change.";
        expect(str.substitute(input, {})).toBe(input);
        expect(str.substitute(input, new Map())).toBe(input);
      });
    });
  });

  describe("numberToBytes & bytesToNumber", () => {
    it("should convert a positive integer to bytes and back", () => {
      const num = 12345;
      const bytes = numberToBytes(num);
      expect(bytesToNumber(bytes)).toBe(num);
    });

    it("should convert a negative integer to bytes and back", () => {
      const num = -67890;
      const bytes = numberToBytes(num);
      expect(bytesToNumber(bytes)).toBe(num);
    });

    it("should convert zero to bytes and back", () => {
      const num = 0;
      const bytes = numberToBytes(num);
      expect(bytesToNumber(bytes)).toBe(num);
    });

    it("should convert a positive float to bytes and back", () => {
      const num = 123.456;
      const bytes = numberToBytes(num);
      expect(bytesToNumber(bytes)).toBe(num);
    });

    it("should convert a negative float to bytes and back", () => {
      const num = -789.012;
      const bytes = numberToBytes(num);
      expect(bytesToNumber(bytes)).toBe(num);
    });

    it("should handle large BigInt numbers", () => {
      const bigNum = BigInt("90071992547409912345"); // Larger than Number.MAX_SAFE_INTEGER
      const bytes = numberToBytes(bigNum);
      expect(bytesToNumber(bytes)).toBe(bigNum);
    });

    it("should handle large negative BigInt numbers", () => {
      const bigNum = BigInt("-90071992547409912345");
      const bytes = numberToBytes(bigNum);
      expect(bytesToNumber(bytes)).toBe(bigNum);
    });

    it("should return 0 for an empty byte array", () => {
      expect(bytesToNumber([])).toBe(0);
    });
  });

  describe("readJSONFromFile", () => {
    const testJsonFilePath = "./temp_test_file.json";
    const testJsonContent = {
      name: "test",
      version: "1.0.0",
      details: { author: "bun" },
      arr: [1, 2, 3],
    };

    beforeAll(async () => {
      await writeFile(testJsonFilePath, JSON.stringify(testJsonContent));
    });

    afterAll(async () => {
      await rm(testJsonFilePath, { force: true });
    });

    it("should read and parse a JSON file correctly", async () => {
      const result = await readJSONFromFile(testJsonFilePath);
      expect(result).toEqual(testJsonContent);
    });

    it("should throw an error if the file does not exist", async () => {
      await expect(readJSONFromFile("./non-existent.json")).rejects.toThrow();
    });

    it("should throw an error for malformed JSON", async () => {
      const malformedPath = "./malformed.json";
      await writeFile(malformedPath, "{invalid json");
      await expect(readJSONFromFile(malformedPath)).rejects.toThrow(SyntaxError);
      await rm(malformedPath);
    });
  });
});

