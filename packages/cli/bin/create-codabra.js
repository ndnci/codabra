#!/usr/bin/env node
import("../dist/create/index.js").then(({ main }) => main(process.argv[2]).catch((err) => {
    console.error(err);
    process.exit(1);
}));
