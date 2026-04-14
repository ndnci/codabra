import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
    docs: [
        "intro",
        {
            type: "category",
            label: "Getting Started",
            items: ["getting-started/installation", "getting-started/quick-start"],
        },
        {
            type: "category",
            label: "Config System",
            items: [
                "config/overview",
                "config/models",
                "config/routes",
                "config/views",
                "config/functions",
                "config/events",
                "config/voters",
            ],
        },
        {
            type: "category",
            label: "CLI",
            items: ["cli/commands"],
        },
        {
            type: "category",
            label: "Providers",
            items: ["providers/overview", "providers/nextjs"],
        },
        {
            type: "category",
            label: "Contributing",
            items: ["contributing/overview", "contributing/add-orm", "contributing/add-database"],
        },
    ],
};

export default sidebars;
