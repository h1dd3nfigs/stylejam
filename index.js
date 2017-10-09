'use strict'

let fs = require('fs')
let path = require('path')

const _ = require('lodash')

let express = require("express");
let app = express();
let port = process.env.PORT || 8080;


app.use(express.static('public'));

module.exports = (mapVars, colorVars, borderVars, deps) => {

	let scssString = ''

	let mapRules = () => {
		if(deps) {
			deps.forEach((dep) => {
				scssString += fs.readFileSync(dep, "utf-8")
			})
		}
		for (let value in mapVars) {
			scssString +=
	`
	@if (type-of(${mapVars[value]}) == color) {
		${value} {
	  	background-color: ${mapVars[value]};
	  }
	}

	`
		}

		colorRules()	
	}

	let colorRules = () => {
		for (let value in colorVars) {
			scssString +=
	`@if (type-of(${colorVars[value]}) == color) {
		${value} {
	  	background-color: ${colorVars[value]};
	  }
	}

	`
		}	

		borderRules()
	}

	let borderRules = () => {
		scssString += 
	`@function borderwidth($input) {
	  @each $part in $input {
	    @if type-of($part) == number {
	      @return true;
	    }
	  }
	  @return false;
	}

	@function bordercolor($input) {
	  @each $part in $input {
	    @if type-of($part) == color {
	      @return true;
	    }
	  }
	  @return false;
	}

	`

		for (let value in borderVars) {
			scssString +=
	`@if bordercolor(${borderVars[value]}) and borderwidth(${borderVars[value]}) {
	  ${value} {
	  	border: ${borderVars[value]}
	  }
	}

	`
		}
		
		fs.writeFile(path.join(__dirname, 'demos/styles.scss'), scssString, function(err) {
			if(err) {
			    return console.log(err);
			}

			console.log("The file was saved!");
		}); 	
	}

	return mapRules()
}


