'use strict';

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

exports.deepCopy = deepCopy;
