"use strict";

const express = require("express");
const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const proxy = require("http-proxy-middleware");
const Config = require("./config");
const builderOptions = Config.getBuildConfig();

const app = express();

module.exports = devConfig => {
  // 添加webpack hmr入口
  for (var key in devConfig.entry) {
    devConfig.entry[key] = [
      `webpack-hot-middleware/client?path=__webpack_hmr`,
      devConfig.entry[key]
    ];
    // 如果是react-hot-loader 3.0，这一行可以注释，为了保持兼容性先保留
    devConfig.entry[key].unshift("react-hot-loader/patch");
  }
  const compiler = webpack(devConfig);

  // 配置devServer
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: devConfig.output.publicPath,
      hot: true,
      color: true,
      stats: "errors-only" // 为了减少webpack不必要的输出，将stats设为errors-only
    })
  );

  // 加入热更新中间件
  app.use(webpackHotMiddleware(compiler));

  // 获取moduleName 和 bizName 组合url
  // TODO: 这里其实并不通用，不是所有的web url都是遵循这个规范，建议之后从feflow配置url时采用直接配置最终的url的方式
  const route = [`/${builderOptions.moduleName}/${builderOptions.bizName}/`];
  const port = devConfig.devServer.port;
  // 转发 这是为了能够将xxx.qq.com/module/biz/__webpack_hmr -> localhost:port/__webpack_hmr 否则热更新长链接将无法连接
  route.forEach(rt => {
    rt &&
      app.use(
        rt,
        proxy({
          target: `http://127.0.0.1:${port}`,
          pathRewrite: { [`^${rt}`]: "/" }
        })
      );
  });

  // Serve the files on port.
  app.listen(devConfig.devServer.port, function() {
    if (err) {
      console.error(err);
    } else {
      console.log(
        `Webpack server listening on port ${devConfig.devServer.port}\n`
      );
    }
  });
};
