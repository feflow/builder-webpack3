'use strict';

const webpack = require('webpack');
const Builder = require('./builder');
const Config = require('./config');

const builderOptions = Config.getBuildConfig();
const devConfig = Builder.createDevConfig(builderOptions);
const prodConfig = Builder.createProdConfig(builderOptions);

exports.devConfig = devConfig;
exports.prodConfig = prodConfig;

module.exports = (cmd) => {
  if (cmd === 'dev') {
    require('./server')(devConfig);
  } else if (cmd === 'build') {
    webpack(prodConfig, (err, stats) => {
      console.log(stats.toString({
        chunks: false,
        color: true,
        children: false
      }));
    });
  }
}
