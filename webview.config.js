//@ts-check

'use strict';

const path = require('path');
const WebpackManifestPlugin = require('webpack-manifest-plugin').WebpackManifestPlugin;

const config = [
  {
    name: 'webview',
    target: 'web',
    entry: './src/presenterView/index.tsx',
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, './out/presenter')
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.js', '.tsx', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [{
            loader: 'ts-loader'
          }]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader']
        },
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
          resolve: {
            fullySpecified: false
          }
        }
      ]
    },
    performance: {
      hints: false
    },
    plugins: [new WebpackManifestPlugin({ publicPath: "" })],
    devServer: {
      compress: true,
      port: 9000,
      hot: true,
      allowedHosts: "all",
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    }
  }
];

module.exports = (env, argv) => {
  for (const configItem of config) {
    configItem.mode = argv.mode;

    if (argv.mode === 'production') {
      configItem.devtool = "hidden-source-map";

      configItem.optimization = {
        splitChunks: {
          chunks: 'all',
        },
      };
    }
  }

  return config;
};