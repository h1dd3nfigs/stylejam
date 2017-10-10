#!/usr/bin/env node
 
let fs = require('fs')

let path = require('path')

let program = require('commander')

let util = require('util')

let sass = require('node-sass')

let _ = require('lodash')

let { parse, stringify } = require('scss-parser') 

let createQueryWrapper = require('./query-ast')

let writeStyles = require('./scss-template.js')

let handlebars = require('handlebars')

let open = require('open')

// 
/**
 * Hello, CLI.
 */

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

let ast = parse(fs.readFileSync(file, 'utf-8'));

let $ = createQueryWrapper(ast)

let mapVars = $().maps()

let colorVars = $().colorVars()

let borderVars = $().borders()

let final = {}

let test = (css, map) => {
    final = {}
    for (let val in map) {
        if(css.search(val) != -1) {
            final[val.substr(1)] = map[val]
        }
    }
    return final
}

let styleData = (maps, colors, borders) => {
    data = { maps, colors, borders }
}

if(program.args.length > 0) {
    
    let deps = program.args.slice(1)
        
        deps.push(program.args[0])
        
        writeStyles(mapVars, colorVars, borderVars, deps)
        
        fs.readFile(path.join(__dirname, 'demos/styles.scss'), 'utf8', (err, contents) => {
            
            sass.render({
                data: contents,
            }, (err, result) => {
                let cssString = result.css.toString()
                let mapData = test(cssString, mapVars)
                let colorData = test(cssString, colorVars)
                let borderData = test(cssString, borderVars)

                _.forIn(colorData, (val, key) => { // TO DO: Separate border classes from color classes
                    if(borderData[key]) {
                        delete colorData[key]
                    }
                })

                styleData(mapData, colorData, borderData)

                fs.writeFile(path.join(__dirname, 'public/css/styles.css'), cssString, function(err) {
                    if(err) {
                        return console.log(err);
                    }
                }); 

                fs.readFile(path.join(__dirname, 'demos/demo-template.html'), 'utf-8', (error, source) => {
                    
                    handlebars.registerHelper('append', (key) => {
                        key = '$' + key.replace(/-stylejam-/g, ' : ')
                        return key
                    })

                    handlebars.registerHelper('prepend', (key) => {
                        key = '$' + key
                        return key
                    })

                    let template = handlebars.compile(source)
                    
                    let html = template(data)
                    
                    fs.writeFile(path.join(__dirname, 'public/index.html'), html, function(err) {
                        if(err) {
                            return console.log(err);
                            }
                    })

                    open(path.join(__dirname, 'public/index.html'))
                })
            })
        })
}

/**
 * Parse into an AST!
 */
if(program.bench) {
    console.time('StyleJam');
}


if(program.bench) {
    console.timeEnd('StyleJam');
}





