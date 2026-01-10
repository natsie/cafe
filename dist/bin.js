#! /usr/bin/env node
import { argv, cwd } from "node:process";
import { Cafe } from "./cafe.js";
const config = {
    port: 3333,
    alias: {},
    basePath: cwd(),
    menu: {
        include: ["**/*"],
        exclude: [],
    },
    exposeAPI: false,
    broadcastVersion: false,
    debugResponseHeaders: false,
};
const booleanOptions = new Set(["exposeAPI", "broadcastVersion", "debugResponseHeaders"]);
let currentOption = "";
for (const arg of argv.slice(2)) {
    let option = arg;
    if (option.startsWith("--")) {
        if (currentOption) {
            throw new Error(`Expected configuration option value after --${currentOption}, received ${option}`);
        }
        option = option.slice(2);
        if (booleanOptions.has(option))
            config[option] = true;
        else
            currentOption = option;
        continue;
    }
    switch (currentOption) {
        case "":
        case "basePath": {
            config.basePath = option;
            break;
        }
        case "port": {
            const port = Number.parseInt(option);
            if (!(Number.isFinite(port) && Number.isInteger(port))) {
                throw new TypeError(`Expected integer port number, received ${option}`);
            }
            if (port < 0 || port > 65535) {
                throw new RangeError(`Expected port number between 0 and 65535, received ${option}`);
            }
            config.port = port;
            break;
        }
        case "include":
        case "exclude": {
            if (option.startsWith("regexp:")) {
                config.menu[currentOption].push(new RegExp(option.slice(8, option.lastIndexOf("/")), option.slice(option.lastIndexOf("/") + 1)));
                break;
            }
            const menuOptions = option.split(":");
            config.menu[currentOption].push(...menuOptions);
            break;
        }
        default: {
            throw new Error(`Unknown configuration option --${currentOption}`);
            break;
        }
    }
    currentOption = "";
}
console.log(`Using configuration:\n${JSON.stringify(config, null, 2)}`);
const cafe = new Cafe(config);
cafe
    .listen(config.port, { incremental: true, retryCount: -1, retryInterval: 500 })
    .then(() => console.log(`A café just opened for business at ${cafe.port}.`));
//# sourceMappingURL=bin.js.map