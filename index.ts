#!/usr/bin/env node

import {Command} from 'commander'
import chalk from "chalk";
import inquirer from "inquirer";
import {chdir, cwd} from 'node:process';
import {execa} from "execa";
import * as fs from 'fs';
import * as path from 'path';

const Listr = require('listr');

const program = new Command()
program
    .name("create-wh3-next-app")
    .description('')
    .version('0.0.1')
    .option("-n, --name  [project_name]", "Project Name")

program.parse();
const options = program.opts();
console.log(chalk.blue("Welcome to the WH3 Next App Generator!"))
const questions = [{
    name: 'name',
    message: 'What are we calling your project?',
    type: 'input'
},
    {
        type: 'list',
        name: 'packageManager',
        message: 'Which package manager are we using?',
        choices: ['yarn', 'npm'],
    }]
if (options.name) {
    console.log("We are calling your project: ")
    console.log(chalk.green(options.name))
    questions.shift()
}
inquirer
    .prompt([...questions])
    .then(async (answers) => {
        await action({
            name: answers.name ? answers.name : options.name,
            pm: answers.packageManager
        })
    })
    .catch((error) => {
        if (error.isTtyError) {
            console.log(chalk.red('Prompt couldn\'t be rendered in the current environment'))
        } else {
            console.log(chalk.red('Something else went wrong.'))
        }
    });

const action = async ({name, pm}: {
    name: string,
    pm: string
}) => {
    if (name) {
        try {
            let pathOfExecution = path.join(process.cwd(), name)
            if (!fs.existsSync(pathOfExecution)) {
                fs.mkdirSync(pathOfExecution);
            } else {
                console.log(chalk.red('Project already exists. Please choose a different name.'))
                return;
            }
        } catch (err) {
            console.error(err);
        }
    }
    try {
        chdir(path.join(process.cwd(), name));
        console.log(`Moving things over at: ${chalk.green(cwd())}`);
    } catch (err) {
        console.error(chalk.red("Couldn't move to the new directory."))
        return
    }

    const tasks = new Listr([
        {
            title: 'Cloning the template',
            enabled: ctx => ctx.git,
            task: (ctx, task) => execa('git', ['clone', 'https://github.com/Wh3official/wh3-next-tailwind-template', '.']).catch(() => {
                ctx.git = false;
                task.skip('Git not available, install it before running this template.`');
            })
        },
        {
            title: 'Install package dependencies with Yarn',
            enabled: ctx => ctx.pm === 'yarn',
            task: (ctx, task) => execa('yarn')
                .catch(() => {
                    ctx.yarn = false;

                    task.skip('Yarn not available, install it via `npm install -g yarn`');
                })
        },
        {
            title: 'Installing package dependencies with NPM',
            enabled: (ctx) => ctx.pm === 'npm',
            task: (ctx, task) => execa('npm', ['install'])
                .catch(() => {
                    ctx.yarn = false;
                    task.skip('NPM not available, install it via `npm install -g npm`');
                })
        },
    ]);
    tasks.run({
        name,
        git: true,
        pm
    }).catch(err => {
        console.error(err);
    });
}
