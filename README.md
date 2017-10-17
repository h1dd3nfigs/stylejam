# Stylejam
:warning:  **Under construction! Not ready for public use.**  :construction:

 Generate a styleguide showing mapped colors, color variables and border variables with one command
 - Provide scss variable file along with imported/dependency files
 - No need to change your Sass or add markdown/notation

## Install

```

	npm install -g stylejam

```

### To view stylejam demo file:

```

	stylejam -d

```

### To generate a styleguide from any scss file: 

```

	Add variable file followed by any dependency files in order of import 

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

## License

[ISC © Carron White.](../LICENSE)
