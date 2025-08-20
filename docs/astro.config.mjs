// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwind from '@astrojs/tailwind';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://demotime.show',
  trailingSlash: 'ignore',
  integrations: [
    starlight({
      logo: {
        src: '/src/assets/demotime-bg.svg',
      },
      title: 'Demo Time',
      social: {
        // github: 'https://github.com/estruyf/vscode-demo-time',
        blueSky: 'https://bsky.app/profile/eliostruyf.com',
        discord: 'https://discord.gg/ETVDS8kqys',
      },
      components: {
        // Relative path to the custom component.
        SocialIcons: './src/components/SocialIcons.astro',
        Footer: './src/components/Footer.astro',
      },
      customCss: [
        // Relative path to your custom CSS file
        './src/styles/tailwind.css',
        './src/styles/custom.css',
      ],
      lastUpdated: true,
      editLink: {
        baseUrl: 'https://github.com/estruyf/demo-time-docs/edit/main/',
      },
      head: [
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://demotime.show/demo-time-og.png',
          }
        },
        {
          tag: "link",
          attrs: {
            href: "https://fonts.googleapis.com",
            rel: "preconnect"
          }
        },
        {
          tag: "link",
          attrs: {
            href: "https://fonts.gstatic.com",
            crossorigin: true,
            rel: "preconnect"
          }
        },
        {
          tag: "link",
          attrs: {
            href: "https://fonts.googleapis.com/css2?family=Hubot+Sans:ital,wght@0,600;1,900&family=Mona+Sans:ital,wght@0,400..900;1,400..900&display=swap",
            rel: "stylesheet"
          }
        }
      ],
      sidebar: [
        {
          label: 'It starts here',
          items: [
            { label: 'Getting started', slug: 'getting-started' },
            { label: 'Adding demos', slug: 'adding-demos' },
            { label: 'Start presenting', slug: 'presentation-mode' },
          ],
        },
        {
          label: 'Actions',
          collapsed: true,
          items: [
            { label: 'File actions', slug: 'actions/file' },
            { label: 'Text actions', slug: 'actions/text' },
            { label: 'Patch actions', slug: 'actions/patch' },
            { label: 'Preview actions', slug: 'actions/preview' },
            { label: 'Setting actions', slug: 'actions/setting' },
            { label: 'Terminal actions', slug: 'actions/terminal' },
            { label: 'Time actions', slug: 'actions/time' },
            { label: 'VS Code actions', slug: 'actions/vscode' },
            { label: 'Snippet actions', slug: 'actions/snippet' },
            { label: 'External Apps actions', slug: 'actions/external' },
            { label: "GitHub Copilot actions", slug: 'actions/copilot' },
            { label: 'Interaction actions', slug: 'actions/interactions' },
          ],
        },
        {
          label: 'Slides',
          collapsed: true,
          items: [
            { label: 'Present your slides', slug: 'slides' },
            {
              label: 'Layouts',
              items: [
                { label: 'Overview', slug: 'slides/layouts' },
                { label: 'Default layout', slug: 'slides/layouts/default' },
                { label: 'Intro layout', slug: 'slides/layouts/intro' },
                { label: 'Section layout', slug: 'slides/layouts/section' },
                { label: 'Quote layout', slug: 'slides/layouts/quote' },
                { label: 'Image layout', slug: 'slides/layouts/image' },
                { label: 'Image left layout', slug: 'slides/layouts/image-left' },
                { label: 'Image right layout', slug: 'slides/layouts/image-right' },
                { label: 'Two columns layout', slug: 'slides/layouts/two-columns' },
                { label: 'Custom layout', slug: 'slides/layouts/custom' },
                { label: 'Header & Footer', slug: 'slides/layouts/header-footer' },
              ],
            },
            {
              label: 'Themes',
              items: [
                { label: 'Overview', slug: 'slides/themes' },
                { label: 'Default theme', slug: 'slides/themes/default' },
                { label: 'Minimal theme', slug: 'slides/themes/minimal' },
                { label: 'Monomi theme', slug: 'slides/themes/monomi' },
                { label: 'Unnamed theme', slug: 'slides/themes/unnamed' },
                { label: 'Quantum theme', slug: 'slides/themes/quantum' },
                { label: 'Frost theme', slug: 'slides/themes/frost' },
                { label: 'Custom theme', slug: 'slides/themes/custom' },
              ],
            },
            { label: 'Slide transitions', slug: 'slides/transitions' },
            { label: 'Animations', slug: 'slides/animations' },
            {
              label: 'Components',
              items: [
                { label: 'Overview', slug:  'slides/components' },
                { label: 'Custom components', slug: 'slides/components/custom' },
              ],
            },
            { label: 'Mermaid', slug: 'slides/mermaid' },
            { label: 'Import PowerPoint slides', slug: 'slides/powerpoint-import' },
            { label: 'Exporting slides', slug: 'slides/export' },
          ]
        },
        {
          label: 'Other features',
          collapsed: true,
          items: [
            { label: 'Presenter view', slug: 'features/presenter-view' },
            { label: 'Using notes', slug: 'features/using-notes' },
            { label: 'URI handler', slug: 'features/uri-handler' },
            { label: 'Timer and clock', slug: 'features/timer-clock' },
            { label: 'MCP server support', slug: 'features/mcp-server' },
          ],
        },
        {
          label: 'References',
          collapsed: true,
          items: [
            { label: 'Commands', slug: 'references/commands' },
            { label: 'Settings', slug: 'references/settings' },
            { label: 'API', slug: 'references/api' },
            { label: 'JSON schema', slug: 'references/json-schema' },
          ]
        },
        {
          label: 'Tips & Tricks',
          collapsed: true,
          items: [
            { label: 'Adding content', slug: 'tips/adding-content' },
            { label: 'Adding steps to your demo', slug: 'tips/adding-steps' },
            { label: 'Highlight code', slug: 'tips/highlighting' },
            { label: 'Working with variables', slug: 'tips/variables' },
            { label: 'Activity bar action', slug: 'tips/move-to-activity-bar' },
            { label: 'Control the next demo shortcut', slug: 'tips/control-next-demo' },
            { label: 'VS Code Settings', slug: 'tips/vscode-settings' },
          ],
        },
        {
          label: 'Integrations',
          collapsed: true,
          items: [
            { label: 'Slidev', slug: 'integrations/slidev' },
            { label: 'PowerPoint', slug: 'integrations/powerpoint' },
            { label: 'Apple Keynote', slug: 'integrations/keynote' },
          ]
        },
        {
          label: 'Snippets',
          collapsed: true,
          items: [
            { label: 'Snippets', slug: 'snippets' },
          ],
        },
        {
          label: 'Examples',
          collapsed: true,
          items: [
            { label: 'Projects', slug: 'examples' },
            { label: 'Showcases', slug: 'examples/showcases' },
          ],
        },
        {
          label: 'Community Articles',
          link: 'articles'
        },
        {
          label: 'Beta version',
          link: 'beta'
        },
        {
          label: 'Contributing',
          link: 'contribute'
        },
        {
          label: 'Support the project ❤️',
          link: 'support'
        },
      ],
    }), 
    tailwind({
      // Disable the default base styles:
      applyBaseStyles: false,
    }), 
    react()
  ],
});