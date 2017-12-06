# builder-webpack

Webpack 构建器, 适用于NOW直播业务和活动类型的项目构建

## 特性
- 集成WDS、HMR
- 支持多页面构建
- 支持html, css, js等静态资源的压缩和文件hash
- 默认集成 Rem 方案, 完美解决多终端适配问题
- 基础lib包React、ReactDOM 以CDN方式引入, 不打到 bundle 包里
- 使用Happypack 多实例构建，飞一般的构建速度
