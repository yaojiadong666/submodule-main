//const { execSync } = require('node:child_process');
//const { readFileSync, existsSync } = require('fs');
//const { join, dirname, relative } = require('path');
import { join, dirname, relative } from 'path';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

import chalk from 'chalk';
import logger from 'consola';

function getGitDir() {
    try {
        return execSync('git rev-parse --show-toplevel', {
            encoding: 'utf-8',
        }).trim();
    } catch (err) {
        // not a git repo
        return '';
    }
}

const rootPath = getGitDir();

//console.log('rootPath', rootPath);

function getRepoConfig() {
    const path2 = join(rootPath, '.gitmodules');
    //console.log('path2', path2);
    if (!existsSync(path2)) {
        return;
    }
    const rawConfig = readFileSync(path2, 'utf-8');
    //console.log(rawConfig);
    // https://www.liaoxuefeng.com/wiki/1022910821149312/1023020952022784
    const arr = rawConfig.replace(/\t/g, '').replace(/\r\n/g, '').split('\n').filter(it => it).map(it => it.replace(/\s/g, ''));
    console.log(arr);
    console.log('--------------------------------------------------');

    let subRepoMap = new Map();
    let curKey;
    arr.forEach((it) => {
        if (it.indexOf('[submodule') > -1) {
            if (!subRepoMap.get(it)) {
                curKey = it;
                subRepoMap.set(it, {});
            }
            return;
        }
        const curVal = subRepoMap.get(curKey);
        //console.log(curVal);
        const [key, val] = it.split('=');
        curVal[key] = val;
    });

    return subRepoMap;

}

const subRepoMap = getRepoConfig();

console.log(subRepoMap);
console.log('--------------------------------------------------');

function runCommand(command, options = {}) {
    if (!options.silent) {
        command.split('&&').forEach((item) => {
            logger.log(chalk.green.bold(item.trim()));
        });
    }

    try {
        const result = execSync(command, { stdio: 'inherit' });

        // line break
        console.log('');
        return result;
    } catch (err) {
        if (options.onError === 'throw') {
            throw err;
        } else {
            logger.error(chalk.red.bold(`命令执行失败：${command}`));
            process.exit();
        }
    }
}

function runCommandInSubRepo(command, path) {
    //execSync('pwd', { stdio: 'inherit' });
    //console.log('subRepo config path',value.path);

    const absolutePath = join(process.cwd(), path);
    console.log('absolutePath =>', absolutePath);

    const relativePath = relative(process.cwd(), absolutePath);
    console.log('relativePath =>', relativePath);

    runCommand(`cd ${relativePath} && ${command}`);
}

function isBranchExist(branchName, cwd) {
    try {
        execSync(`git show-ref refs/heads/${branchName}`, {
            cwd,
            encoding: 'utf-8',
        });
        return true;
    } catch (err) {
        return false;
    }
}

subRepoMap.forEach(value => {
    const { path, branch } = value;
    runCommandInSubRepo(`git ss`, path);
    //runCommandInSubRepo(`git br`, value.path);
    //console.log(isBranchExist(branch, path));
    //if (isBranchExist(branch, path)) {
    //    runCommandInSubRepo(`git checkout ${branch}`, path);
    //} else {
    //    runCommandInSubRepo(
    //        `git fetch origin && git checkout ${branch}`,
    //        path
    //    );
    //}
});
console.log('--------------------------------------------------');
