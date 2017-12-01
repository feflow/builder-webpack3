'use strict';

const fs = require('fs');
const path = require('path');

class Config {
    /**
     * @function getBuildConfig
     * @desc     找到项目.git目录
     */
    static getGitDir() {
        let currDir = process.cwd();

        while (!fs.existsSync(path.join(currDir, '.git'))) {
            currDir = path.join(currDir, '../');

            // unix跟目录为/， win32系统根目录为 C:\\格式的
            if (currDir === '/' || /^[a-zA-Z]:\\$/.test(currDir)) {
                log.error('不是一个合法的Git项目，没有.git目录');
                shell.exit();
            }
        }

        return currDir;
    }

    /**
     * @function getBuildConfig
     * @desc     获取项目目录下的 feflow.json 配置文件下面的 builderOptions 字段
     */
    static getBuildConfig() {
        const currDir = Config.getGitDir();

        const jsonPath = path.join(currDir, 'feflow.json');
        if (!fs.existsSync(jsonPath)) {
            throw new Error('当前Git项目根目录下未找到feflow.json');
        } else {
            const fileContent = fs.readFileSync(jsonPath, 'utf-8');

            let feflowCfg;

            try {
                feflowCfg = JSON.parse(fileContent);
            } catch (ex) {
                throw new Error('请确保feflow.json配置是一个Object类型，并且含有builderOptions字段');
            }

            return feflowCfg.builderOptions;
        }
    }
}

module.exports = Config;