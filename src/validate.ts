import type { Assert, Check } from "./types/validate.d.ts";

const _check_string: Check["string"] = (value) => typeof value === "string";
const _check_number: Check["number"] = (value) => typeof value === "number";
_check_number.aan = (value): value is number => _check_number(value) && !Number.isNaN(value);
_check_number.positive = (value): value is number => _check_number(value) && value > 0;
_check_number.negative = (value): value is number => _check_number(value) && value < 0;
_check_number.zero = (value): value is number => _check_number(value) && value === 0;
_check_number.integer = (value): value is number => _check_number(value) && Number.isInteger(value);
_check_number.float = (value): value is number =>
  _check_number(value) && Number.isFinite(value) && !Number.isInteger(value);
_check_number.finite = (value): value is number => _check_number(value) && Number.isFinite(value);
_check_number.safeInteger = (value): value is number =>
  _check_number(value) && Number.isSafeInteger(value);
const _check_boolean: Check["boolean"] = (value) => typeof value === "boolean";
const _check_true: Check["true"] = (value) => _check_boolean(value) && value;
const _check_false: Check["false"] = (value) => _check_boolean(value) && !value;
const _check_symbol: Check["symbol"] = (value) => typeof value === "symbol";
const _check_null: Check["null"] = (value) => value === null;
const _check_undefined: Check["undefined"] = (value) => value === undefined;
const _check_object: Check["object"] = (value) => typeof value === "object" && value !== null;
const _check_array: Check["array"] = (value) => Array.isArray(value);
const _check_arraybuffer: Check["arraybuffer"] = (value) => value instanceof ArrayBuffer;
const _check_arraybufferview: Check["arraybufferview"] = (value) => ArrayBuffer.isView(value);
const _check_regexp: Check["regexp"] = (value) => value instanceof RegExp;
const _check_nonNullable: Check["nonNullable"] = (value) => value != null;

const _base_assert = (value: unknown, message?: string): asserts value => {
  if (!value) throw new TypeError(message || "value is not truthy");
};
const _assert_string: Assert["string"] = (value, message) =>
  _base_assert(_check_string(value), message || "The provided value is not a string");
const _assert_number: Assert["number"] = (value, message) =>
  _base_assert(_check_number(value), message || "The provided value is not a number");
_assert_number.aan = (value, message) =>
  _base_assert(_check_number.aan(value), message || "The provided value is not a number");
_assert_number.positive = (value, message) =>
  _base_assert(
    _check_number.positive(value),
    message || "The provided value is not a positive number",
  );
_assert_number.negative = (value, message) =>
  _base_assert(
    _check_number.negative(value),
    message || "The provided value is not a negative number",
  );
_assert_number.zero = (value, message) =>
  _base_assert(_check_number.zero(value), message || "The provided value is not zero");
_assert_number.integer = (value, message) =>
  _base_assert(_check_number.integer(value), message || "The provided value is not an integer");
_assert_number.float = (value, message) =>
  _base_assert(_check_number.float(value), message || "The provided value is not a float");
_assert_number.finite = (value, message) =>
  _base_assert(_check_number.finite(value), message || "The provided value is not a finite number");
_assert_number.safeInteger = (value, message) =>
  _base_assert(
    _check_number.safeInteger(value),
    message || "The provided value is not a safe integer",
  );
const _assert_boolean: Assert["boolean"] = (value, message) =>
  _base_assert(_check_boolean(value), message || "The provided value is not a boolean");
const _assert_true: Assert["true"] = (value, message) =>
  _base_assert(_check_boolean(value) && value, message || "The provided value is not true");
const _assert_false: Assert["false"] = (value, message) =>
  _base_assert(_check_boolean(value) && !value, message || "The provided value is not false");
const _assert_symbol: Assert["symbol"] = (value, message) =>
  _base_assert(_check_symbol(value), message || "The provided value is not a symbol");
const _assert_null: Assert["null"] = (value, message) =>
  _base_assert(_check_null(value), message || "The provided value is not null");
const _assert_undefined: Assert["undefined"] = (value, message) =>
  _base_assert(_check_undefined(value), message || "The provided value is not undefined");
const _assert_object: Assert["object"] = (value, message) =>
  _base_assert(_check_object(value), message || "The provided value is not an object");
const _assert_array: Assert["array"] = (value, message) =>
  _base_assert(_check_array(value), message || "The provided value is not an array");
const _assert_arraybuffer: Assert["arraybuffer"] = (value, message) =>
  _base_assert(_check_arraybuffer(value), message || "The provided value is not an arraybuffer");
const _assert_arraybufferview: Assert["arraybufferview"] = (value, message) =>
  _base_assert(
    _check_arraybufferview(value),
    message || "The provided value is not an arraybuffer view",
  );
const _assert_regexp: Assert["regexp"] = (value, message) =>
  _base_assert(_check_regexp(value), message || "The provided value is not a regexp");
const _assert_nonNullable: Assert["nonNullable"] = (value, message) =>
  _base_assert(_check_nonNullable(value), message || "The provided value is null or undefined");

export const assert: Assert = {
  string: _assert_string,
  number: _assert_number,
  boolean: _assert_boolean,
  true: _assert_true,
  false: _assert_false,
  symbol: _assert_symbol,
  null: _assert_null,
  undefined: _assert_undefined,
  object: _assert_object,
  array: _assert_array,
  arraybuffer: _assert_arraybuffer,
  arraybufferview: _assert_arraybufferview,
  regexp: _assert_regexp,
  nonNullable: _assert_nonNullable,
};
export const check: Check = {
  string: _check_string,
  number: _check_number,
  boolean: _check_boolean,
  true: _check_true,
  false: _check_false,
  symbol: _check_symbol,
  null: _check_null,
  undefined: _check_undefined,
  object: _check_object,
  array: _check_array,
  arraybuffer: _check_arraybuffer,
  arraybufferview: _check_arraybufferview,
  regexp: _check_regexp,
  nonNullable: _check_nonNullable,
};

export const nonNullable = <T>(value: T): NonNullable<T> =>
  (assert.false(value == null, "The provided value is null or undefined"), value) as NonNullable<T>;
export const isNonNullable = <T>(value: T): value is NonNullable<T> => value != null;
