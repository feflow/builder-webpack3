'use strict';

const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const app = express();

module.exports = (devConfig) => {
  const compiler = webpack(devConfig);

  // Tell express to use the webpack-dev-middleware and use the webpack.config.js
  // configuration file as a base.
  app.use(webpackDevMiddleware(compiler, {
    publicPath: devConfig.output.publicPath,
    stats: {
      colors: true
    }
  }));

  // Serve the files on port.
  app.listen(devConfig.devServer.port, function () {
    console.log(`Webpack server listening on port ${devConfig.devServer.port}!\n`);
  });
};
