# builder-webpack


[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/iv-web/feflow/blob/master/LICENSE)
[![npm package](https://img.shields.io/npm/v/builder-webpack3.svg?style=flat-square)](https://www.npmjs.org/package/builder-webpack3)
[![NPM downloads](http://img.shields.io/npm/dt/builder-webpack3.svg?style=flat-square)](https://npmjs.org/package/builder-webpack3)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cpselvis/builder-webpack3/pulls)

Webpack 构建器, 适用于NOW直播业务和活动类型的项目构建

## 特性
- 集成WDS、HMR
- 支持多页面构建
- 支持html, css, js等静态资源的压缩和文件hash
- 支持 css 和 js import 绝对路径写法
- 支持 Fis3 的html文件 inline 语法糖
- 默认集成 Rem 方案, 完美解决多终端适配问题
- 支持雪碧图(图片后缀加__sprite)
- 基础lib包React、ReactDOM 以CDN方式引入, 不打到 bundle 包里
- 使用Happypack 多实例构建，飞一般的构建速度

## 如何使用

### 添加feflow.json配置文件
在项目的工程根目录下面添加feflow.json文件, 配置文件中的builderType为构建器的类型, 即构建器的npm包名称; builderOptions是构建的配置参数，包括模块名、业务名、压缩控制和本地开发端口号和Rem配置等等。

``` bash
{
    "builderType": "builder-webpack3",
    "builderOptions": {
        "moduleName": "mobile",
        "bizName": "category",
        "minifyHTML": true,
        "minifyCSS": true,
        "minifyJS": true,
        "inlineCSS": true,
        "usePx2rem": true,
        "remUnit": 100,
        "remPrecision": 8,
        "inject": true,
        "port": 8001
    }
}
```

### 通过feflow运行构建命令
确保feflow的版本在 v0.12.0 以上, 可以通过如下命令安装最新feflow版本
```
$ npm install feflow-cli -g
```

安装完毕后
```
$ feflow dev      # 本地开发时的命令
$ feflow build    # 发布时的打包命令, 打出的包在工程的public目录, 包含 cdn, webserver 和 offline 三个文件夹
```

### 或者通过 npm script 运行命令
在根目录下面创建webpack.config.js 和 webpack.dev.js文件

webpack.config.js文件内容
``` javascript
module.exports = require('builder-webpack3').prodConfig;
```

webpack.dev.js 文件内容
``` javascript
module.exports = require('builder-webpack3').devConfig;
```

增加 npm script 和 builder-webpack3 开发依赖
``` bash
  "scripts": {
    "dev": "nodemon --watch webpack.dev.js --exec \"webpack-dev-server --config webpack.dev.js\" --progress --colors",
    "build": "webpack --config webpack.config.js --env production --progress --colors",
    ...
  },
  "devDependencies": {
    "builder-webpack3": "^0.2.3"
  }
```

### 说明
同时支持Fis3项目的inline语法糖写法和ejs的写法

inline html
``` bash
# ejs inline语法
${require('raw-loader!../../assets/inline/meta.html')}

# fis3 里面的 inline 写法，已经支持
<!--inline[/assets/inline/meta.html]-->
```

inline javascript
``` bash
# ejs inline语法
<script>${require('raw-loader!babel-loader!../../node_modules/@tencent/report-whitelist')}</script>

# fis3 里面的 inline 写法，已经支持
<script src="@tencent/report-whitelist?__inline"></script>
```

###   开发调试
- 执行 $ tnpm run dev  命令后会在本地的 8001 端口开启一个 WDS 服务，所有的静态资源(html, css, js, img) 都会在内存里面。可以通过 http://127.0.0.1:8001/webpack-dev-server  查看
![](https://qpic.url.cn/feeds_pic/ajNVdqHZLLDpvNiayyEbzqB9V61CRiallnRdEKFaViaxw7pibicBKgEI8vw/)


- Fiddler配置把之前的本地绝对路径改成 本地server 路径即可：
![](https://qpic.url.cn/feeds_pic/Q3auHgzwzM72dIPZyXSdy8srwzIOTovf0VSaNlBzE98ueBiaibIVSHkA/)

## 版本日志

[版本日志](CHANGELOG.md)

## 许可证

[MIT](https://tldrlegal.com/license/mit-license)
