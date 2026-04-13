import { JSONLoader } from "@codabra/core";
import { validateModels, validateRoutes } from "@codabra/core";
import chalk from "chalk";
import { findConfigDir, logSuccess, logError, logInfo } from "../utils";

export interface ValidateOptions {
    config?: string;
}

export async function validateCommand(opts: ValidateOptions = {}): Promise<boolean> {
    const configDir = opts.config ?? findConfigDir();
    if (!configDir) {
        logError("Could not find a /config directory. Run this command from your project root.");
        return false;
    }
    logInfo(`Validating config at: ${configDir}`);

    const loader = new JSONLoader();
    let config;
    try {
        config = await loader.load(configDir);
    } catch (err) {
        logError(`Failed to load config: ${String(err)}`);
        return false;
    }

    const modelErrors = validateModels(config.models);
    const routeErrors = validateRoutes(config.routes);
    const totalErrors = modelErrors.length + routeErrors.length;

    if (totalErrors === 0) {
        logSuccess(
            `All config files are valid! (${config.models.length} models, ${config.routes.length} routes, ${config.views.length} views)`,
        );
        return true;
    }

    console.log(chalk.red(`\nFound ${totalErrors} validation error(s):\n`));

    for (const err of modelErrors) {
        const location = err.field ? `${err.model}.${err.field}` : err.model;
        console.log(`  ${chalk.red("✖")} [model:${location}] ${err.message}`);
    }

    for (const err of routeErrors) {
        console.log(`  ${chalk.red("✖")} [route:${err.route}] ${err.message}`);
    }

    console.log("");
    return false;
}
