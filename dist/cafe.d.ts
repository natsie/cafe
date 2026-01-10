import { EventEmitter } from "node:events";
import type * as ICafe from "./types/cafe.d.ts";
export declare const cafeStatusMap: ICafe.StatusMap;
declare class Cafe extends EventEmitter<ICafe.EventMap> {
    config: ICafe.Config;
    private hono;
    private server;
    private _port;
    constructor(config?: ICafe.PartialConfig);
    get port(): number;
    listen(port?: number, options?: ICafe.ListenOptions): Promise<Cafe>;
    close(): Promise<Cafe>;
}
export { Cafe };
//# sourceMappingURL=cafe.d.ts.map