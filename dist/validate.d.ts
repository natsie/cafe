import type { Assert, Check } from "./types/validate.d.ts";
export declare const assert: Assert;
export declare const check: Check;
export declare const nonNullable: <T>(value: T) => NonNullable<T>;
export declare const isNonNullable: <T>(value: T) => value is NonNullable<T>;
//# sourceMappingURL=validate.d.ts.map