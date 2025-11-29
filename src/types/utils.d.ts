export type CallbackFunction<T> = (value: T) => void;

export interface CreateReadStreamOptions {
  offset?: number;
  length?: number;
  chunkSize?: number;
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: CallbackFunction<T>;
  reject: CallbackFunction<unknown>;
}
