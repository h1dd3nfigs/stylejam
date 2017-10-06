'use strict'

let fs = require('fs')
let path = require('path')
let { parse, stringify } = require('scss-parser')
let createQueryWrapper = require('./query-ast')

let css = fs.readFileSync(path.resolve('sample.scss'), "utf-8")
let cssSimpleMap = fs.readFileSync(path.resolve('sample-simple-map.scss'), "utf-8")
const _ = require('lodash')
let ast = parse( css )
let astSimple = parse( cssSimpleMap )

let $ = createQueryWrapper( ast )
const util = require('util')

// console.log($().maps())




