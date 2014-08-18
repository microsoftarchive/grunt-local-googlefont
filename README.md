grunt-local-googlefont
======================

Download and use local Google fonts in your Grunt jobs

## Install

```
$ npm install --save grunt-local-googlefont
```

## Configure
```
{
  "lato": {
    "options": {
      "family": "Lato",
      "sizes": [
        300,400,700,900
      ],
      "cssDestination": "site/styles",
      "fontDestination": "public/fonts"
    }
  }
}
```

## Execute

```
$ grunt local-googlefont:lato
```
