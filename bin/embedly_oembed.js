#!/usr/bin/env node
var path = require('path')

require.paths.unshift(path.join(__dirname, '../lib'))

var embedly = require("embedly")

var args = process.argv.slice(2)

var usage = 
  [ 'Fetch JSON from the embedly oembed service.'
  , 'Usage embedly_oembed.js [OPTIONS] <url> [url]..'
  , ''
  , 'Options:'
  , ' -h, --host HOST          Embedly service host.  If key is present'
  , '                          default is pro.embed.ly, else it is'
  , '                          api.embed.ly'
  , ' -k, --key                Embedly Pro key. [default:'
  , '                          EMBEDLY_KEY environmental variable]'
  , ' -o, --option NAME=VALUE  Set option to be passed as a query parameter.'
  , ''
  , 'Common Options:'
  , ' -v, --verbose            Run verbosely.'
  , ' -h, --help               Display this message.'
  , ''
  , 'Bob Corsaro <bob@embed.ly>'
].join('\n')

var arg
var urls = []
while (args.length) {
  arg = args.shift()
  switch (arg) {
    case '-h':
    case '--help':
      console.log(usage)
      process.exit()
    default:
      urls.push(arg)
  }
}

var api = new embedly.api()
api.oembed({
  urls: urls
})

