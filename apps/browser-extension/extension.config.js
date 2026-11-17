/** @type {import('extension').ExtensionConfig} */
module.exports = {
  vite: (config) => {
    config.plugins = config.plugins || [];
    config.plugins.push(require('@tailwindcss/vite').default());
    return config;
  }
};
