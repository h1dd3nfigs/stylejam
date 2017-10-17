# Stylejam
:warning:  **Under construction! Not ready for public use.**  :construction:

 Generate a styleguide showing mapped colors, color variables and border variables with one command
 - Provide scss variable file along with imported/dependency files
 - No need to change your Sass or add markdown/notation

## Install

```javascript
npm install -g stylejam
```

### To view stylejam demo file:

```javascript
stylejam -d
```

### To generate a styleguide from any scss file: 

```javascript
Add variable file followed by any dependency files in order of import 

stylejam <path/to/variable-file.scss> [<path/to/dependency.scss>]
```

### HDM Shortcuts

#### FRE

```javascript
stylejam -m ~/yourmedia-platform-parent-directory elledecor
```

#### EDIT
```javascript
stylejam -e ~/yourmedia-platform-parent-directory
```

## License

[ISC © Carron White.](../LICENSE)
