import { describe, expect, it } from "bun:test";
import { assert, check, isNonNullable, nonNullable } from "../validate.js";
describe("Validators", () => {
    describe("check", () => {
        describe("string", () => {
            it("should return true for strings, false otherwise", () => {
                expect(check.string("hello")).toBe(true);
                expect(check.string("")).toBe(true);
                expect(check.string(123)).toBe(false);
                expect(check.string(null)).toBe(false);
                expect(check.string({})).toBe(false);
            });
        });
        describe("number", () => {
            it("should return true for numbers, false otherwise", () => {
                expect(check.number(123)).toBe(true);
                expect(check.number(0)).toBe(true);
                expect(check.number(NaN)).toBe(true);
                expect(check.number(Infinity)).toBe(true);
                expect(check.number("123")).toBe(false);
            });
            it(".aan should return true for actual numbers (not NaN)", () => {
                expect(check.number.aan(123)).toBe(true);
                expect(check.number.aan(0)).toBe(true);
                expect(check.number.aan(Infinity)).toBe(true);
                expect(check.number.aan(NaN)).toBe(false);
            });
            it(".positive should return true for positive numbers", () => {
                expect(check.number.positive(1)).toBe(true);
                expect(check.number.positive(0.1)).toBe(true);
                expect(check.number.positive(0)).toBe(false);
                expect(check.number.positive(-1)).toBe(false);
            });
            it(".negative should return true for negative numbers", () => {
                expect(check.number.negative(-1)).toBe(true);
                expect(check.number.negative(-0.1)).toBe(true);
                expect(check.number.negative(0)).toBe(false);
                expect(check.number.negative(1)).toBe(false);
            });
            it(".zero should return true only for 0", () => {
                expect(check.number.zero(0)).toBe(true);
                expect(check.number.zero(-0)).toBe(true);
                expect(check.number.zero(1)).toBe(false);
                expect(check.number.zero(0.1)).toBe(false);
            });
            it(".integer should return true for integers", () => {
                expect(check.number.integer(123)).toBe(true);
                expect(check.number.integer(0)).toBe(true);
                expect(check.number.integer(-5)).toBe(true);
                expect(check.number.integer(12.34)).toBe(false);
            });
            it(".float should return true for floats", () => {
                expect(check.number.float(12.34)).toBe(true);
                expect(check.number.float(-0.5)).toBe(true);
                expect(check.number.float(123)).toBe(false);
                expect(check.number.float(Infinity)).toBe(false);
                expect(check.number.float(NaN)).toBe(false);
            });
            it(".finite should return true for finite numbers", () => {
                expect(check.number.finite(123)).toBe(true);
                expect(check.number.finite(12.34)).toBe(true);
                expect(check.number.finite(Infinity)).toBe(false);
                expect(check.number.finite(-Infinity)).toBe(false);
                expect(check.number.finite(NaN)).toBe(false);
            });
            it(".safeInteger should return true for safe integers", () => {
                expect(check.number.safeInteger(123)).toBe(true);
                expect(check.number.safeInteger(Number.MAX_SAFE_INTEGER)).toBe(true);
                expect(check.number.safeInteger(Number.MIN_SAFE_INTEGER)).toBe(true);
                expect(check.number.safeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
                expect(check.number.safeInteger(12.34)).toBe(false);
            });
        });
        describe("boolean", () => {
            it("should return true for booleans, false otherwise", () => {
                expect(check.boolean(true)).toBe(true);
                expect(check.boolean(false)).toBe(true);
                expect(check.boolean(0)).toBe(false);
                expect(check.boolean("true")).toBe(false);
            });
        });
        describe("true", () => {
            it("should return true only for true", () => {
                expect(check.true(true)).toBe(true);
                expect(check.true(false)).toBe(false);
                expect(check.true(1)).toBe(false);
            });
        });
        describe("false", () => {
            it("should return true only for false", () => {
                expect(check.false(false)).toBe(true);
                expect(check.false(true)).toBe(false);
                expect(check.false(0)).toBe(false);
            });
        });
        describe("symbol", () => {
            it("should return true for symbols, false otherwise", () => {
                expect(check.symbol(Symbol("s"))).toBe(true);
                expect(check.symbol("s")).toBe(false);
            });
        });
        describe("null", () => {
            it("should return true only for null", () => {
                expect(check.null(null)).toBe(true);
                expect(check.null(undefined)).toBe(false);
                expect(check.null(0)).toBe(false);
            });
        });
        describe("undefined", () => {
            it("should return true only for undefined", () => {
                expect(check.undefined(undefined)).toBe(true);
                expect(check.undefined(null)).toBe(false);
            });
        });
        describe("object", () => {
            it("should return true for objects, false otherwise", () => {
                expect(check.object({})).toBe(true);
                expect(check.object([])).toBe(true);
                expect(check.object(new Date())).toBe(true);
                expect(check.object(null)).toBe(false);
                expect(check.object("string")).toBe(false);
            });
        });
        describe("array", () => {
            it("should return true for arrays, false otherwise", () => {
                expect(check.array([])).toBe(true);
                expect(check.array([1, 2])).toBe(true);
                expect(check.array({})).toBe(false);
            });
        });
        describe("arraybuffer", () => {
            it("should return true for ArrayBuffer, false otherwise", () => {
                expect(check.arraybuffer(new ArrayBuffer(8))).toBe(true);
                expect(check.arraybuffer(new Uint8Array(8))).toBe(false);
            });
        });
        describe("arraybufferview", () => {
            it("should return true for ArrayBuffer views, false otherwise", () => {
                expect(check.arraybufferview(new Uint8Array(8))).toBe(true);
                expect(check.arraybufferview(new DataView(new ArrayBuffer(16)))).toBe(true);
                expect(check.arraybufferview(new ArrayBuffer(8))).toBe(false);
            });
        });
        describe("regexp", () => {
            it("should return true for RegExp objects, false otherwise", () => {
                expect(check.regexp(/abc/)).toBe(true);
                expect(check.regexp(new RegExp("abc"))).toBe(true);
                expect(check.regexp("abc")).toBe(false);
                expect(check.regexp(123)).toBe(false);
                expect(check.regexp({})).toBe(false);
                expect(check.regexp(null)).toBe(false);
            });
        });
        describe("nonNullable", () => {
            it("should return true for non-nullish values, false otherwise", () => {
                expect(check.nonNullable("s")).toBe(true);
                expect(check.nonNullable(0)).toBe(true);
                expect(check.nonNullable(null)).toBe(false);
                expect(check.nonNullable(undefined)).toBe(false);
            });
        });
    });
    describe("assert", () => {
        const testAssert = (name, validValue, invalidValue, message) => {
            describe(name, () => {
                it("should not throw for valid values", () => {
                    expect(() => assert[name](validValue)).not.toThrow();
                });
                it("should throw TypeError for invalid values", () => {
                    expect(() => assert[name](invalidValue)).toThrow(TypeError);
                    expect(() => assert[name](invalidValue)).toThrow(message);
                });
                it("should throw a custom message", () => {
                    expect(() => assert[name](invalidValue, "custom")).toThrow("custom");
                });
            });
        };
        testAssert("string", "hello", 123, "The provided value is not a string");
        testAssert("boolean", true, "true", "The provided value is not a boolean");
        testAssert("true", true, false, "The provided value is not true");
        testAssert("false", false, true, "The provided value is not false");
        testAssert("symbol", Symbol("a"), "a", "The provided value is not a symbol");
        testAssert("null", null, undefined, "The provided value is not null");
        testAssert("undefined", undefined, null, "The provided value is not undefined");
        testAssert("object", {}, null, "The provided value is not an object");
        testAssert("array", [], {}, "The provided value is not an array");
        testAssert("arraybuffer", new ArrayBuffer(8), new Uint8Array(8), "The provided value is not an arraybuffer");
        testAssert("arraybufferview", new Uint8Array(8), new ArrayBuffer(8), "The provided value is not an arraybuffer view");
        testAssert("nonNullable", 0, null, "The provided value is null or undefined");
        describe("regexp", () => {
            it("should not throw for valid RegExp objects", () => {
                expect(() => assert.regexp(/abc/)).not.toThrow();
                expect(() => assert.regexp(new RegExp("abc"))).not.toThrow();
            });
            it("should throw TypeError for invalid values", () => {
                expect(() => assert.regexp("abc")).toThrow(TypeError);
                expect(() => assert.regexp("abc")).toThrow("The provided value is not a regexp");
                expect(() => assert.regexp(123)).toThrow(TypeError);
                expect(() => assert.regexp({})).toThrow(TypeError);
                expect(() => assert.regexp(null)).toThrow(TypeError);
            });
            it("should throw a custom message", () => {
                expect(() => assert.regexp("abc", "custom regexp error")).toThrow("custom regexp error");
            });
        });
        describe("number", () => {
            it("should not throw for a number", () => {
                expect(() => assert.number(123)).not.toThrow();
            });
            it("should throw a TypeError for a non-number", () => {
                expect(() => assert.number("123")).toThrow("The provided value is not a number");
            });
            describe(".aan", () => {
                it("should not throw for a non-NaN number", () => {
                    expect(() => assert.number.aan(123)).not.toThrow();
                });
                it("should throw for NaN", () => {
                    expect(() => assert.number.aan(NaN)).toThrow("The provided value is not a number");
                });
            });
            describe(".positive", () => {
                it("should not throw for a positive number", () => {
                    expect(() => assert.number.positive(1)).not.toThrow();
                });
                it("should throw for zero or negative numbers", () => {
                    expect(() => assert.number.positive(0)).toThrow("The provided value is not a positive number");
                    expect(() => assert.number.positive(-1)).toThrow("The provided value is not a positive number");
                });
            });
            describe(".negative", () => {
                it("should not throw for a negative number", () => {
                    expect(() => assert.number.negative(-1)).not.toThrow();
                });
                it("should throw for zero or positive numbers", () => {
                    expect(() => assert.number.negative(0)).toThrow("The provided value is not a negative number");
                    expect(() => assert.number.negative(1)).toThrow("The provided value is not a negative number");
                });
            });
            describe(".zero", () => {
                it("should not throw for zero", () => {
                    expect(() => assert.number.zero(0)).not.toThrow();
                });
                it("should throw for non-zero numbers", () => {
                    expect(() => assert.number.zero(1)).toThrow("The provided value is not zero");
                });
            });
            describe(".integer", () => {
                it("should not throw for an integer", () => {
                    expect(() => assert.number.integer(123)).not.toThrow();
                });
                it("should throw for a float", () => {
                    expect(() => assert.number.integer(12.3)).toThrow("The provided value is not an integer");
                });
            });
            describe(".float", () => {
                it("should not throw for a float", () => {
                    expect(() => assert.number.float(12.3)).not.toThrow();
                });
                it("should throw for an integer", () => {
                    expect(() => assert.number.float(123)).toThrow("The provided value is not a float");
                });
            });
            describe(".finite", () => {
                it("should not throw for a finite number", () => {
                    expect(() => assert.number.finite(123)).not.toThrow();
                });
                it("should throw for Infinity", () => {
                    expect(() => assert.number.finite(Infinity)).toThrow("The provided value is not a finite number");
                });
            });
            describe(".safeInteger", () => {
                it("should not throw for a safe integer", () => {
                    expect(() => assert.number.safeInteger(123)).not.toThrow();
                });
                it("should throw for an unsafe integer", () => {
                    expect(() => assert.number.safeInteger(Number.MAX_SAFE_INTEGER + 1)).toThrow("The provided value is not a safe integer");
                });
            });
        });
    });
    describe("nonNullable function", () => {
        it("should return the value if it's not null or undefined", () => {
            expect(nonNullable(0)).toBe(0);
            expect(nonNullable("")).toBe("");
            expect(nonNullable(false)).toBe(false);
            const obj = {};
            expect(nonNullable(obj)).toBe(obj);
        });
        it("should throw a TypeError for null or undefined", () => {
            expect(() => nonNullable(null)).toThrow(TypeError);
            expect(() => nonNullable(undefined)).toThrow(TypeError);
            expect(() => nonNullable(null)).toThrow("The provided value is null or undefined");
        });
    });
    describe("isNonNullable function", () => {
        it("should return true for non-nullish values", () => {
            expect(isNonNullable(0)).toBe(true);
            expect(isNonNullable("")).toBe(true);
            expect(isNonNullable(false)).toBe(true);
            expect(isNonNullable({})).toBe(true);
        });
        it("should return false for null and undefined", () => {
            expect(isNonNullable(null)).toBe(false);
            expect(isNonNullable(undefined)).toBe(false);
        });
    });
});
//# sourceMappingURL=validate.test.js.map