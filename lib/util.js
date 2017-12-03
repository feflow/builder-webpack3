'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 深拷贝, Object.assign()只有第一层是深拷贝, 第二层之后仍然是 浅拷贝
 * @param source
 * @returns {{}}
 */
const deepCopy = (source) => {
    const ret = {};

    for (var k in source) {
        ret[k] = typeof source[k] ==='object' ? deepCopy(source[k]) : source[k]
    }
    return ret;
};

/**
 * 列出某个目录下的子目录, DFS算法
 * @param root         目录路径
 * @param level        列出的子目录层级
 * @param directories  默认为[]
 * @returns {*|Array}
 */
const listDir =(root, level, directories) => {
    directories = directories || [];

    if (!fs.existsSync(root)) {
        return files;
    }

    if (fs.statSync(root).isDirectory() && level > 0) {
        fs.readdirSync(root)
            .forEach((name) => {
                const dirPath = path.join(root, name);
                if (fs.statSync(dirPath).isDirectory()) {
                    directories.push({
                        name,
                        dirPath
                    });
                    listDir(dirPath, level - 1, directories);
                }
            })
    }

    return directories;
}

exports.deepCopy = deepCopy;
exports.listDir = listDir;
