# Stylejam
:warning:  **Under construction! Not ready for public use.**  :construction:

 Generate a styleguide showing mapped colors, color variables and border variables with one command
 - Provide scss variable file along with imported/dependency files
 - No need to change your Sass or add markdown/notation

----

## Who is this for?

A company that wants to audit the colors, fonts and borders that are actually in use and compare them to what was intended for use.  A developer who is less familiar with the sass or css mappings can quickly look something up and move on instead of wasting time searching.


## Example:
<img src="https://raw.githubusercontent.com/bcrebel/stylejam/master/demos/sample.png">


----


## Install

Pre-requisites: [Node.js](https://nodejs.org/en/) 6.0.0 or up.

```

npm install -g stylejam      

```

### To view stylejam demo file:

```

stylejam -d      

```

### To generate a styleguide from any scss file:  

Add the variable file followed by any dependency files in order of import      

```

stylejam <path/to/variable-file.scss> [<path/to/dependency.scss>]     

```

### HDM Shortcuts

#### FRE

```

stylejam -m ~/yourmedia-platform-parent-directory elledecor     

```

#### EDIT
```

stylejam -e ~/yourmedia-platform-parent-directory     

```

----

## Contribute!

The stylejam team welcomes your help in maintaining and growing this tool. 

Here are a few of the kinds of contributions we are looking for:

1. **Bug fixes:** tackle any bugs you find in this project's [issues tracker](https://github.com/bcrebel/stylejam/issues).
2. **New features:** automatically resolve the dependency relationship between scss files instead of having the user specify them.
3. Improve stylejam's code coverage in automated tests.

----

## License

[ISC © Carron White.](../LICENSE)
