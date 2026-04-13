import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
    title: "Codabra",
    tagline: "Configuration-driven application generator",
    favicon: "img/favicon.ico",

    future: {
        v4: true,
    },

    url: "https://codabra.dev",
    baseUrl: "/",

    organizationName: "codabra",
    projectName: "codabra",

    onBrokenLinks: "throw",

    i18n: { defaultLocale: "en", locales: ["en"] },

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    routeBasePath: "/",
                },
                blog: false,
                theme: { customCss: "./src/css/custom.css" },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        navbar: {
            title: "Codabra",
            items: [
                { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
                { href: "https://github.com/ndnci/codabra", label: "GitHub", position: "right" },
            ],
        },
        footer: {
            style: "dark",
            copyright: `Copyright © ${new Date().getFullYear()} Codabra. Built with Docusaurus.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
