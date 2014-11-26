var fs = require('fs');
var request = require('request');
var cssparser = require('cssparser');
var parser = new cssparser.Parser();
var mkdirp = require('mkdirp');

module.exports = function (grunt) {

  'use strict';

  function downloadFontsForUserAgent (options, url, key, userAgent, done) {

    request({
      'url': url,
      'headers': {
        'User-Agent': userAgent
      }
    }, function (error, response, body) {

      var json = parseCSS(body);
      var rules = json.rulelist.slice();

      function next () {

        if (!rules.length) {
          return writeStylesheet(options, key, body, json.rulelist, done);
        }

        var rule = rules.shift();
        if (rule.type === 'fontface') {
          var url = getDownloadUrl(rule.declarations.src);
          var filename = options.fontDestination + '/' + getFilename(rule, key, url);

          body = formatBody(options, body, url, filename);
          downloadFont(url, filename, next);
        }
      }

      next();
    });
  }

  function parseCSS (data) {
    return parser.parse(cleanCSS(data));
  }

  function cleanCSS (css) {
    return css.replace(/unicode-range\:(\s|\w|\d|\+|-|,)*;/g, '');
  }

  function formatBody (options, body, url, filename) {

    if (options.fontBaseDir) {
      filename = filename.replace(options.fontBaseDir + '/', '');
    }

    body = body.replace(url, '\'' + filename + '\'');

    var included = [];
    var parts = body.split(',');

    parts.forEach(function (part) {
      if (part.indexOf('woff2') < 0) {
        included.push(part);
      }
    });

    return included.join(',');
  }

  function writeStylesheet (options, key, body, rules, done) {

    var name = rules[0].declarations['font-family'];

    var destination = options.cssDestination;
    mkdirp.sync(destination);

    destination += '/font_' + name.replace(/'/g, '').toLowerCase();
    destination += '_' + key + '.styl';

    grunt.file.write(destination, cleanCSS(body));
    done();
  }

  function downloadFont (source, destination, done) {

    grunt.log.write('Downloading ' + destination + '... ');

    var parts = destination.split('/');
    parts.pop();
    var destFolder = parts.join('/');
    mkdirp.sync(destFolder);

    var file = fs.createWriteStream(destination);
    var remote = request(source);

    remote.on('data', function (chunk) {
      file.write(chunk);
    });

    remote.on('end', function () {
      grunt.log.ok();
      file.end();
      done();
    });
  }

  function getFilename (rule, key, url) {

    var filename = '';
    var extension = url.split('.').pop();

    ['font-family', 'font-style', 'font-weight'].forEach(function (name) {

      filename += rule.declarations[name].replace(/'/g, '') + '_';
    });

    filename = filename + key + '.' + extension;
    return filename;
  }

  function getDownloadUrl (string) {

    var matches = string.match(/url\(([\S]+)\)/);
    var match = matches && matches[1];

    if (!match) return '';

    if (match.indexOf('woff2') > 0)
      return getDownloadUrl(string.replace(match, ''));

    return match;
  }

  function getPublicUrl (family, sizes, subsets) {

    var url = 'http://fonts.googleapis.com/css?family=' + family + ':' + sizes.join(',');
    if (subsets) {
      url += '&subset=' + subsets.join(',');
    }
    return url;
  }

  var downloadFontsTask = function downloadFontsForUrl () {

    var options = this.options();
    var done = this.async();

    if (!options.family) {
      grunt.fail.fatal('Invalid font family');
    }
    if (!options.sizes || !options.sizes.length) {
      grunt.fail.fatal('Invalid font size(s) declaration');
    }

    var url = getPublicUrl(options.family, options.sizes, options.subsets);

    if (!options.userAgents) {
      options.userAgents = {
        'default': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1944.0 Safari/537.36"
      };
    }

    var userAgents = Object.keys(options.userAgents);

    function next () {

      if (!userAgents.length) {
        return done();
      }

      var userAgentKey = userAgents.shift();
      var userAgent = options.userAgents[userAgentKey];

      downloadFontsForUserAgent(options, url, userAgentKey, userAgent, next);
    }

    next();
  };

  grunt.registerMultiTask('local-googlefont', downloadFontsTask);
};
