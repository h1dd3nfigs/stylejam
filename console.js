#!/usr/bin/env node
 
/**
 * Module dependencies.
 */
 
let fs = require('fs')
let path = require('path')
let program = require('commander')
let util = require('util')

let express = require("express");
let writeStyles = require('./index.js')
let app = express();
let port = process.env.PORT || 8080;
let open = require('open')

// ~/carron-dev/media-platform/fre-hdm/sites/cosmopolitan/assets/scss/_variables.scss
// ~/carron-dev/media-platform/mp-bower-assets/scss/_utils.scss
// ~/carron-dev/media-platform/fre-hdm/assets/scss/_variables.scss
// webjam ~/carron-dev/media-platform/fre-hdm/sites/cosmopolitan/assets/scss/_variables.scss ~/carron-dev/media-platform/mp-bower-assets/scss/_utils.scss ~/carron-dev/media-platform/mp-bower-assets/scss/_system.scss ~/carron-dev/media-platform/fre-hdm/assets/scss/_variables.scss
// 
/**
 * Hello, CLI.
 */

// Program needs to accept var scss file
    // webjam ~/cosmopolitan/variables.scss
    // take that file and run scss commands
    // take optional dependencies and node sass compile dependencies + generated css files

program
    .version(require('./package.json').version)
    .usage('[options] <file>')
    .option('-b, --bench', 'measure and output timing data')
    .parse(process.argv);


// File is a required parameter
if(program.args.length === 0) {
    console.error(`You must provide a source file.`);
    process.exit(1);
}

/**
 * Read input.
 */
const file = path.resolve(program.args[0]);

// The file must exist!
if(!fs.existsSync(file)) {
    console.error(`Couldn't load '${file}'.`);
    process.exit(1);
}

const input = fs.readFileSync(file, 'utf-8');


if(program.args.length > 1) {
    let deps = program.args.slice(1)
        deps.push(program.args[0])
        writeStyles(input, deps)
}

/**
 * Parse into an AST!
 */
if(program.bench) {
    console.time('WebJam');
}


if(program.bench) {
    console.timeEnd('WebJam');
}





