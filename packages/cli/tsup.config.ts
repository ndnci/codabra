import { defineConfig } from "tsup";
import pkg from "./package.json";
import * as fs from "fs";

export default defineConfig({
    entry: ["src/index.ts", "src/create/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    noExternal: ["@codabra/core", "@codabra/providers"],
    define: {
        __CLI_VERSION__: JSON.stringify(pkg.version),
    },
    async onSuccess() {
        fs.cpSync("../core/src/schemas", "schemas", { recursive: true });
    },
});
