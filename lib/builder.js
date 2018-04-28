'use strict';

/**
 * Copyright (c) 2018 Tencent Inc.
 *
 * Webpack构建器，适用于NOW直播IVWEB团队工程项目.
 *
 * cpselvis <cpselvis@gmal.com>
 */
const osenv = require('osenv');
const fs = require('fs');
const path = require('path');
const glob = require("glob");
const webpack = require('webpack');
const HappyPack = require('happypack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const ReplaceBundleStringPlugin = require('replace-bundle-webpack-plugin');
const HtmlStringReplace = require('html-string-replace-webpack-plugin');
const StringReplaceWebpackPlugin = require('string-replace-webpack-plugin');
const SriPlugin = require('webpack-subresource-integrity');
const OfflineWebpackPlugin = require('offline-webpack-plugin');
const {deepCopy, listDir, merge, isEmpty} = require('./util');
const Config = require('./config');
const projectRoot = Config.getPath();

// 最基础的配置
const baseConfig = {
    entry: glob.sync(path.join(projectRoot, './src/pages/*')),
    module: {
        rules: []
    },
    plugins: [],
    resolve: {
        alias: glob.sync(path.join(projectRoot, './src/*/')) // 支持Webpack import绝度路径的写法
    },
    resolveLoader: {}
};

class Builder {

    /**
     * @function createDevConfig
     * @desc     创建用于开发过程中的webpack打包配置
     *
     * @param {Object}  options                         参数
     * @param {Boolean} options.usePx2rem               是否启用px2rem
     * @param {Number}  options.remUnit                 px2rem的单位, 默认75
     * @param {Number}  options.remPrecision            px2rem的精度，默认8
     * @param {Number}  options.port                    webpack打包的端口号，默认8001
     * @param {String}  options.inject                  是否注入chunks
     *
     * @example
     */
    static createDevConfig(options) {
        const devConfig = deepCopy(baseConfig);

        // 设置打包规则
        const devRules = [];
        // 设置HTML解析规则
        devRules.push(Builder._setHtmlRule());
        // 设置图片解析规则
        devRules.push(Builder._setImgRule(false));
        // 设置CSS解析规则
        devRules.push(Builder._setCssRule());
        // 设置SCSS解析规则，开发环境不压缩CSS
        devRules.push(Builder._setScssRule(false, options.usePx2rem, options.remUnit, options.remPrecision));
        // 设置JS解析规则
        devRules.push(Builder._setJsRule());
        // 设置字体解析规则
        devRules.push(Builder._setFontRule());

        // 设置打包插件
        let devPlugins = [];
        devPlugins.push(new StringReplaceWebpackPlugin());
        // 设置提取CSS为一个单独的文件的插件
        devPlugins.push(Builder._setExtractTextPlugin(false, ''));
        // React, react-dom 通过cdn引入
        devPlugins.push(Builder._setExternalPlugin(options.externals));
        // 设置NODE_ENV 为 development
        devPlugins.push(Builder._setDefinePlugin('development'));
        // 多实例构建
        devPlugins.push(Builder._setHappyPack(options.jsLoader));
        // 多页面打包
        const {newEntry, htmlWebpackPlugins} = Builder._setMultiplePage(devConfig.entry, false, options.inject, false, '', '');
        devPlugins = devPlugins.concat(htmlWebpackPlugins);

        devConfig.entry = newEntry;
        // 开发阶段增加sourcemap.
        devConfig.devtool = 'inline-source-map';
        devConfig.output = Builder._setOutput(false, '', '/');
        devConfig.module.rules = devRules;
        devConfig.plugins = devPlugins;
        devConfig.devServer = Builder._setDevServer(options.port || 8001);
        devConfig.resolve.alias = Builder._setAlias(options.alias);
        // 设置 loader 的npm包查找的相对路径，此处设置在全局的 .feflow 目录下
        devConfig.resolveLoader = Builder._setResolveLoaderPath(options.runtime);

        return devConfig;
    }

    /**
     * @function createProdConfig
     * @desc     创建用于生产环境中的webpack打包配置
     *
     * @param {Object}  options                         参数
     * @param {Boolean} options.minifyHTML              是否压缩HTML
     * @param {Boolean} options.minifyCSS               是否压缩CSS
     * @param {Boolean} options.minifyJS                是否压缩JS
     * @param {Boolean} options.usePx2rem               是否启用px2rem
     * @param {Number}  options.remUnit                 px2rem的单位, 默认75
     * @param {Number}  options.remPrecision            px2rem的精度，默认8
     * @param {String}  options.moduleName              模块名称
     * @param {String}  options.bizName                 业务名称
     * @param {String}  options.inject                  是否注入chunks
     * @example
     */
    static createProdConfig(options) {
        const prodConfig = deepCopy(baseConfig);

        const bizName = options.bizName;
        const moduleName = options.moduleName;
        // 业务域名
        const domain = options.domain || 'now.qq.com';
        const cdn = options.cdn || '11.url.cn';
        const product = options.product || 'now';
        // Html 路径前缀, 打包时的目录
        const htmlPrefix = `webserver/${bizName}`;
        // Css, Js, Img等静态资源路径前缀, 打包时的目录
        const assetsPrefix = `cdn/${bizName}`;
        const cdnUrl = `//${cdn}/${product}/${moduleName}/${bizName}`;
        const serverUrl = `//${domain}/${moduleName}/${bizName}`;
        const regex = new RegExp(assetsPrefix + '/', 'g');

        // 设置打包规则
        const prodRules = [];
        // 设置HTML解析规则
        prodRules.push(Builder._setHtmlRule());
        // 设置图片解析规则, 图片需要hash
        prodRules.push(Builder._setImgRule(true, assetsPrefix));
        // 设置CSS解析规则
        prodRules.push(Builder._setCssRule());
        // 设置SCSS解析规则，生产环境默认压缩CSS
        prodRules.push(Builder._setScssRule(options.minifyCSS || true, options.usePx2rem, options.remUnit, options.remPrecision));
        // 设置JS解析规则
        prodRules.push(Builder._setJsRule());
        // 设置字体解析规则
        prodRules.push(Builder._setFontRule());

        // 设置打包插件
        let prodPlugins = [];
        // 清空Public目录插件, https://github.com/johnagan/clean-webpack-plugin/issues/17
        prodPlugins.push(new CleanWebpackPlugin(['public'], {
            root: projectRoot,
            verbose: true,
            dry: false
        }));
        prodPlugins.push(new StringReplaceWebpackPlugin());
        // 设置提取CSS为一个单独的文件的插件
        prodPlugins.push(Builder._setExtractTextPlugin(true, assetsPrefix));
        if (options.minifyJS) {
            // 压缩JS
            prodPlugins.push(new webpack.optimize.UglifyJsPlugin());
        }
        // React, react-dom 通过cdn引入
        prodPlugins.push(Builder._setExternalPlugin(options.externals));
        // Inline 生成出来的css
        prodPlugins.push(new HtmlWebpackInlineSourcePlugin());
        // 设置NODE_ENV 为 production
        prodPlugins.push(Builder._setDefinePlugin('production'));
        // 多实例构建
        prodPlugins.push(Builder._setHappyPack(options.jsLoader));
        // 支持Fis3的 inline 语法糖 多页面打包, 默认压缩html
        const {newEntry, htmlWebpackPlugins} = Builder._setMultiplePage(prodConfig.entry, options.minifyHTML, options.inject, options.inlineCSS, assetsPrefix, htmlPrefix);

        prodPlugins = prodPlugins.concat(htmlWebpackPlugins);
        // 修复html引用css和js的路径问题
        prodPlugins.push(Builder._setReplaceHtmlPlugin(regex, ''));
        // 修复js和css中引用的图片路径问题
        prodPlugins.push(Builder._setReplaceBundlePlugin(regex, ''));
        // 给生成出来的js bundle增加跨域头(cross-origin)，便于错误日志记录
        prodPlugins.push(Builder._setSriPlugin());

        prodPlugins.push(Builder._setOffline(assetsPrefix, htmlPrefix, cdnUrl, serverUrl, domain, cdn, product));

        prodConfig.entry = newEntry;
        prodConfig.output = Builder._setOutput(true, assetsPrefix, cdnUrl + '/');
        prodConfig.module.rules = prodRules;
        prodConfig.plugins = prodPlugins;
        prodConfig.resolve.alias = Builder._setAlias(options.alias);
        // 设置 loader 的npm包查找的相对路径，此处设置在全局的 .feflow 目录下
        prodConfig.resolveLoader = Builder._setResolveLoaderPath(options.runtime);

        return prodConfig;
    }

    static _setHappyPack(jsLoader) {
        let options = Object.assign({
            cacheDirectory: true,
            plugins: [
                'transform-decorators-legacy',
                [
                    "import", {
                        "libraryName": "antd",
                        "libraryDirectory": "es",
                        "style": "css"
                    }
                ]
            ],
            presets: ['env', 'stage-0', 'react']
        }, jsLoader);

        return new HappyPack({
            loaders: [
                {
                    loader: 'babel-loader',
                    options
                }
            ]
        })
    }

    /**
     * 设置打包后的输出 output 内容
     * @param useHash               是否开启JS资源hash
     * @param pathPrefix            JS的前缀, 不传入则为空
     * @param publicPath
     * @returns {{filename: string, path: string, publicPath: *}}
     * @private
     */
    static _setOutput(useHash, pathPrefix, publicPath) {
        let filename = '';
        let hash = '';

        if (pathPrefix) {
            filename = pathPrefix + '/';
        }

        if (useHash) {
            hash = '_[chunkhash:8]';
        }

        return {
            filename: `${filename}[name]${hash}.js?_bid=152`,
            path: path.join(projectRoot, 'public/'),
            publicPath: publicPath,
            crossOriginLoading: 'anonymous'
        };
    }

    /**
     * 设置图片解析规则
     * @param useHash               是否开启图片资源hash
     * @param pathPrefix            图片的前缀，不传入则为空
     * @returns {{test: RegExp, use: {loader: string, options: {name: string}}}}
     * @private
     */
    static _setImgRule(useHash, pathPrefix) {
        let filename = '';
        let hash = '';

        if (pathPrefix) {
            filename = pathPrefix + '/';
        }

        if (useHash) {
            hash = '_[hash:8]';
        }

        return {
            test: /\.(png|svg|jpg|gif)$/,
            use: {
                loader: 'file-loader',
                options: {
                    name: `${filename}img/[name]${hash}.[ext]`
                }
            }
        };
    }

    /**
     * 设置字体解析规则
     */
    static _setFontRule() {
        return {
            test: /\.(woff|woff2|eot|ttf|otf)$/,
            use: {
                loader: 'file-loader'
            }
        };
    }

    /**
     * 设置 Html 文件解析规则
     * 支持 Fis3 的 ?inline 语法糖
     *
     * @returns {{test: RegExp, use: Array}}
     * @private
     */
    static _setHtmlRule() {
        const htmlRuleArray = [];

        htmlRuleArray.push({
            loader: 'html-loader',
            options: {
                // 支持 html `${}` 语法
                interpolate: 1,
                attrs: [':src']
            }
        });

        // Fis3 inline 语法糖支持
        htmlRuleArray.push({
            loader: 'replace-text-loader',
            options: {
                rules: [
                    {
                        // inline script, 匹配所有的<script src="package?__inline"></script> 需要inline的标签
                        // 并且替换为
                        // <script>${require('raw-loader!babel-loader!../../node_modules/@tencent/report
                        // - whitelist')}</script> 语法
                        pattern: /<script.*?src="(.*?)\?__inline".*?>.*?<\/script>/gmi,
                        replacement: (source) => {
                            // 找到需要 inline 的包
                            const result = /<script.*?src="(.*?)\?__inline"/gmi.exec(source);
                            const pkg = result && result[1];
                            return "<script>${require('raw-loader!babel-loader!" + pkg + "')}</script>";
                        }
                    }, {
                        // inline html, 匹配<!--inline[/assets/inline/meta.html]-->语法
                        pattern: /<!--inline\[.*?\]-->/gmi,
                        replacement: (source) => {
                            // 找到需要 inline 的包
                            const result = /<!--inline\[(.*?)\]-->/gmi.exec(source);
                            let path = result && result[1];
                            if (path && path[0] === '/') {
                                path = '../..' + path;
                            }

                            return "${require('raw-loader!" + path + "')}";
                        }
                    }
                ]
            }
        });

        return {test: /index\.html$/, use: htmlRuleArray}
    }

    /**
     * 设置CSS解析规则
     */
    static _setCssRule() {
        return {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }
    }

    /**
     * 设置Scss文件解析规则
     *
     * @param minimize              是否压缩Css
     * @param usePx2rem             是否使用px2rem loader
     * @param remUnit               rem单位，默认75
     * @param remPrecision          rem精度, 默认8
     * @returns {{test: RegExp, use: *}}
     * @private
     */
    static _setScssRule(minimize, usePx2rem, remUnit, remPrecision) {
        const cssRuleArray = [];

        // 加载Css loader, 判断是否开启压缩
        const cssLoaderRule = {
            loader: "css-loader",
            options: {
                alias: Builder._setAlias()
            }
        };
        if (minimize) {
            cssLoaderRule.options = {
                minimize: true
            };
        }

        cssRuleArray.push(cssLoaderRule);

        // 如果开启px2rem，则加载px2rem-loader
        if (usePx2rem) {
            cssRuleArray.push({
                loader: "px2rem-loader",
                options: {
                    remUnit: remUnit || 75,
                    remPrecision: remPrecision || 8
                }
            });
        }

        // css 前缀，兼容低版本浏览器
        cssRuleArray.push({loader: "autoprefixer-loader"});

        // 加载解析scss的sass-loader
        cssRuleArray.push({
            loader: "sass-loader",
            options: {
                includePaths: [path.join(projectRoot, "./src")]
            }
        });

        // 雪碧图loader
        cssRuleArray.push({loader: "sprites-loader"});

        // 支持scss里面的绝对路径写法，比如 @import "/assets/css/mixin";
        cssRuleArray.push(StringReplaceWebpackPlugin.replace({
            replacements: [
                {
                    pattern: /@import\s*"(\/.*?)";/gmi,
                    replacement: function (match) {
                        const result = /@import\s*"(\/.*?)";/gmi.exec(match);
                        let path = result && result[1];
                        if (path && path[0] === '/') {
                            path = path.substring(1);
                        }

                        return `@import "${path}";`;
                    }
                }
            ]
        }));

        return {
            test: /\.scss$/,
            use: ExtractTextPlugin.extract({fallback: 'style-loader', use: cssRuleArray})
        };
    }

    /**
     * 设置Js文件解析规则, 此处使用happypack,多实例构建
     *
     * @returns {{test: RegExp, loader: string}}
     * @private
     */
    static _setJsRule() {
        return {test: /\.js$/, loader: 'happypack/loader'};
    }

    /**
     * 打包构建后替换的内容, 此处替换html文件
     * @param regex                正则
     * @param replaceWith          替换成xx字符串
     * @returns {HtmlStringReplace}
     * @private
     */
    static _setReplaceHtmlPlugin(regex, replaceWith) {
        return new HtmlStringReplace({
            enable: true,
            patterns: [
                {
                    match: regex,
                    replacement: () => {
                        return replaceWith;
                    }
                }
            ]
        })
    }

    /**
     * 打包构建后替换的内容, 此处替换css和js文件
     * @param regex                正则
     * @param replaceWith          替换成xx字符串
     * @returns {ReplaceBundleStringPlugin}
     * @private
     */
    static _setReplaceBundlePlugin(regex, replaceWith) {
        return new ReplaceBundleStringPlugin([
            {
                partten: regex,
                replacement: () => {
                    return replaceWith;
                }
            }
        ]);
    }

    /**
     * 设置提取Css资源的插件
     * @param useHash               是否开启图片资源hash
     * @param pathPrefix            CSS的前缀，不传入则为空
     * @private
     */
    static _setExtractTextPlugin(useHash, pathPrefix) {
        let filename = '';
        let hash = '';

        if (pathPrefix) {
            filename = pathPrefix + '/';
        }

        if (useHash) {
            hash = '_[contenthash:8]';
        }

        return new ExtractTextPlugin(`${filename}[name]${hash}.css`);
    }

    /**
     * 不把React, react-dom打到公共包里
     * 
     * @private
     */
    static _setExternalPlugin(externals) {
        const newExternals = externals || [
            {
                module: 'react',
                entry: '//11.url.cn/now/lib/15.1.0/react-with-addons.min.js?_bid=3123',
                global: 'React'
            }, {
                module: 'react-dom',
                entry: '//11.url.cn/now/lib/15.1.0/react-dom.min.js?_bid=3123',
                global: 'ReactDOM'
            }
        ];

        return new HtmlWebpackExternalsPlugin({externals: newExternals});
    }

    /**
     * 多页面打包
     * @param entries             glob的entry路径
     * @param minifyHtml          是否压缩html
     * @param inject              是否自动注入打包出来的js和css
     * @param inlineCSS           是否inline打包出来的css
     * @param assetsPrefix        Css, Js, img的路径前缀
     * @param htmlPrefix          Html的路径前缀
     * @returns {{newEntry: {}, htmlWebpackPlugins: Array}}
     * @private
     */
    static _setMultiplePage(entries, minifyHtml, inject, inlineCSS, assetsPrefix, htmlPrefix) {
        const newEntry = {};
        const htmlWebpackPlugins = [];

        Object
            .keys(entries)
            .map((index) => {
                const entry = entries[index];
                const entryFile = `${entry}/init.js`;
                // 支持 init.js 文件不是必须存在的场景，纯html
                const isEntryFileExists = fs.existsSync(entryFile);
                const match = entry.match(/\/pages\/(.*)/);
                const pageName = match && match[1];

                let filename = '';
                if (htmlPrefix) {
                    filename = htmlPrefix + '/';
                }

                if (isEntryFileExists) {
                    newEntry[pageName] = entryFile;
                }
                
                htmlWebpackPlugins.push(new HtmlWebpackPlugin({
                    inlineSource: inlineCSS
                        ? '\\.css$'
                        : undefined,
                    template: path.join(projectRoot, `src/pages/${pageName}/index.html`),
                    filename: `${filename}${pageName}.html`,
                    chunks: [pageName],
                    assetsPrefix: `${assetsPrefix}/`,
                    inject: inject && isEntryFileExists,
                    minify: minifyHtml
                        ? {
                            html5: true,
                            collapseWhitespace: true,
                            preserveLineBreaks: false,
                            minifyCSS: true,
                            minifyJS: true,
                            removeComments: false
                        }
                        : false
                }));
            });

        return {newEntry, htmlWebpackPlugins};
    }

    /**
     * 给生成的 js bundle文件增加 crossorigin="anonymous" 跨域头
     * @returns {SriPlugin}
     * @private
     */
    static _setSriPlugin() {
        return new SriPlugin({
            hashFuncNames: ['sha256', 'sha384']
        });
    }

    /**
     * 离线包打包逻辑
     * @param assetsPrefix            CSS、Img、JS等打包路径前缀
     * @param htmlPrefix              Html打包路径前缀
     * @param cdnUrl                  CDN路径
     * @param serverUrl               now.qq.com路径
     * @param domain                  域名
     * @param cdn                     cdn路径
     * @param product                 cdn对应的产品
     * @private
     */
    static _setOffline(assetsPrefix, htmlPrefix, cdnUrl, serverUrl, domain, cdn, product) {
        return new OfflineWebpackPlugin({
            path: path.join(projectRoot, './public/offline'),
            filename: 'offline.zip',
            pathMapper: (assetPath) => {
                if (assetPath.indexOf(htmlPrefix) !== -1) {
                    // 所有资源都改成 now.qq.com 的域名， 防止跨域问题
                    assetPath = assetPath.replace(htmlPrefix, '');
                } else if (assetPath.indexOf(assetsPrefix) !== -1) {
                    assetPath = assetPath.replace(assetsPrefix, '');
                }
                return path.join(serverUrl.replace('//', ''), assetPath);
            },
            beforeAddBuffer(source, assetPath) {
                if (assetPath.indexOf(htmlPrefix) !== -1) {
                    // 基础包域名修改， 防止跨域问题
                    source = source.replace(/\/\/11\.url\.cn\/now\/([^"'\)\`]+)(["'\`\)])/g, `//${domain}/$1$2`);
                    // 业务资源的域名修改， 防止跨域问题
                    const regex = new RegExp(`//${cdn}/${product}/([^"'\)\`]+)(["'\`\)])`, 'g');
                    source = source.replace(regex, `//${domain}/$1$2`);
                    // 去掉 crossorigin="annoymous"
                    source = source.replace(/crossorigin=\"anonymous\"/g, '');
                    // 去掉 业务 js 文件的 ?_bid=152
                    source = source.replace(/\?_bid=152/g, '');
                    // 去掉业务 js 上的 integrity 属性
                    source = source.replace(/(<script.*)integrity=".*?"/, '$1');
                    // 注入离线包的版本号. pack
                    const inject = {
                        version: Date.now()
                    };
                    source = source.replace(/(<script)/, '<script>var pack = ' + JSON.stringify(inject) + '</script>$1');
                }

                return source;
            }
        })
    }

    /**
     * 设置NODE_ENV，否则 线上会报 warning.
     * https://stackoverflow.com/questions/30030031
     */
    static _setDefinePlugin(env) {
        return new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(env)
        });
    }

    /**
     * 设置dev server，WDS配置
     * @param port
     * @returns {{contentBase: string, inline: boolean, historyApiFallback: boolean, disableHostCheck: boolean, port: *}}
     * @private
     */
    static _setDevServer(port) {
        return {
            contentBase: path.join(projectRoot, './src'),
            inline: true,
            historyApiFallback: false,
            disableHostCheck: true,
            port: port
        };
    }

    /**
     * 设置引用的Alias路径匹配规则，以src下面的目录为根目录
     * 支持import TitleBar from "/modules/components/titlebar" 绝对路径语法
     * @param  alias 用户自定义的alias
     *
     * @private
     */
    static _setAlias(alias) {
        const aliasObject = {};

        listDir(path.join(projectRoot, './src'), 1).forEach((dir) => {
            const {name, dirPath} = dir;

            aliasObject['/' + name] = dirPath;
            aliasObject[name] = dirPath;
        });

        if (isEmpty(alias)) {
            return aliasObject;
        }

        return merge(alias, aliasObject);
    }

    /**
     * 设置Loader的path查找的目录
     * 好处是：把构建器放在 ./feflow 目录下，多个项目可以公用一个构建器，便于构建器的增量更新和统一升级
     */
    static _setResolveLoaderPath(runtime) {
        const jbRuntime = runtime || 'runtime-now-6';
        const resolveLoaderPath = path.join(osenv.home(), './.feflow/node_modules');
        // Loader在捷豹平台的查找路径
        const jbLoaderPath = `/data/frontend/install/AlloyDist/${jbRuntime}/node_modules`;

        return {
            modules: [
                resolveLoaderPath,
                jbLoaderPath
            ]
        };
    }
}

module.exports = Builder;