export type AssertFunction<T> = (value: unknown, message?: string) => asserts value is T;
export type CheckFunction<T> = (value: unknown) => value is T;
export interface Assert {
  string: AssertFunction<string>;
  number: AssertFunction<number> & {
    /** "Actually a number" assertion function. Fails on `NaN`. */
    aan: AssertFunction<number>;
    positive: AssertFunction<number>;
    negative: AssertFunction<number>;
    zero: AssertFunction<number>;
    integer: AssertFunction<number>;
    float: AssertFunction<number>;
    finite: AssertFunction<number>;
    safeInteger: AssertFunction<number>;
  };
  true: AssertFunction<true>;
  false: AssertFunction<false>;
  boolean: AssertFunction<boolean>;
  symbol: AssertFunction<symbol>;
  null: AssertFunction<null>;
  undefined: AssertFunction<undefined>;
  object: AssertFunction<object>;
  array: AssertFunction<unknown[]>;
  arraybuffer: AssertFunction<ArrayBuffer>;
  arraybufferview: AssertFunction<ArrayBufferView>;
  regexp: AssertFunction<RegExp>;
  nonNullable: <T>(value: T, message?: string) => asserts value is NonNullable<T>;
}
export interface Check {
  string: CheckFunction<string>;
  number: CheckFunction<number> & {
    /** "Actually a number" check function. Fails on `NaN`. */
    aan: CheckFunction<number>;
    positive: CheckFunction<number>;
    negative: CheckFunction<number>;
    zero: CheckFunction<number>;
    integer: CheckFunction<number>;
    float: CheckFunction<number>;
    finite: CheckFunction<number>;
    safeInteger: CheckFunction<number>;
  };
  boolean: CheckFunction<boolean>;
  true: CheckFunction<true>;
  false: CheckFunction<false>;
  symbol: CheckFunction<symbol>;
  null: CheckFunction<null>;
  undefined: CheckFunction<undefined>;
  object: CheckFunction<object>;
  array: CheckFunction<unknown[]>;
  arraybuffer: CheckFunction<ArrayBuffer>;
  arraybufferview: CheckFunction<ArrayBufferView>;
  regexp: CheckFunction<RegExp>;
  nonNullable: <T>(value: T) => value is NonNullable<T>;
}
