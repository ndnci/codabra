import { defineConfig } from 'vitepress';
import { getCliVersion } from './lib/cli-version';

const cliVersion = getCliVersion();

export default defineConfig({
  title: 'Codabra',
  description: 'Configuration-driven application generator',
  lang: 'en-US',
  base: '/codabra/',

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'Codabra' }],
    ['meta', { name: 'og:description', content: 'Configuration-driven application generator' }],
    ['meta', { name: 'og:image', content: 'https://ndnci.github.io/codabra/logo.png' }],
  ],

  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'Codabra',

    nav: [
      { text: 'Guide', link: '/getting-started/introduction' },
      { text: 'Config', link: '/config/overview' },
      { text: 'CLI', link: '/cli/commands' },
      {
        text: `v${cliVersion}`,
        items: [
          { text: 'Changelog', link: 'https://github.com/ndnci/codabra/releases' },
          {
            text: 'Contributing',
            link: 'https://github.com/ndnci/codabra/blob/main/CONTRIBUTING.md',
          },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Quick Start', link: '/getting-started/quick-start' },
        ],
      },
      {
        text: 'Config System',
        items: [
          { text: 'Overview', link: '/config/overview' },
          { text: 'Models', link: '/config/models' },
          { text: 'Routes', link: '/config/routes' },
          { text: 'Views', link: '/config/views' },
          { text: 'Functions', link: '/config/functions' },
          { text: 'Events', link: '/config/events' },
          { text: 'Voters', link: '/config/voters' },
        ],
      },
      {
        text: 'CLI',
        items: [{ text: 'Commands', link: '/cli/commands' }],
      },
      {
        text: 'Providers',
        items: [
          { text: 'Overview', link: '/providers/overview' },
          { text: 'Next.js', link: '/providers/nextjs' },
        ],
      },
      {
        text: 'Deployment',
        items: [{ text: 'Docker', link: '/deployment/docker' }],
      },
      {
        text: 'Contributing',
        items: [
          { text: 'Overview', link: '/contributing/overview' },
          { text: 'Add an ORM', link: '/contributing/add-orm' },
          { text: 'Add a Database', link: '/contributing/add-database' },
        ],
      },
    ],

    editLink: {
      pattern: 'https://github.com/ndnci/codabra/edit/main/apps/docs/:path',
      text: 'Edit this page on GitHub',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/ndnci/codabra' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © 2024–present Ahliman HUSEYNOV`,
    },

    search: { provider: 'local' },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
});
