'use strict';

const Webpack = require('./webpack');
const Config = require('./config');

const builderOptions = Config.getBuildConfig();

exports.devConfig = Webpack.createDevConfig(builderOptions);
exports.prodConfig = Webpack.createProdConfig(builderOptions);
