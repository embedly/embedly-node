#!/usr/bin/env node
require.paths.unshift(require('path').join(__dirname, '../lib'))
var method = require('path').basename(__filename).match(/^embedly_([^.]+)(\.js)?$/)[1]
  , embedly = require("embedly")
  , args = process.argv.slice(2)
  , opts = 
    { host: null
    , key: process.env.EMBEDLY_KEY
    , params: {urls: []}
    }
  , usage =
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
  , arg

while (args.length) {
  arg = args.shift()
  switch (arg) {
    case '-h':
    case '--help':
      console.log(usage)
      process.exit()
    case '-k':
    case '--key':
      opts.key = args.shift()
      break
    case '-o':
    case '--option':
      kv = args.shift().split('=')
      opts.options[kv[0]] = kv[1]
      break
    default:
      opts.params.urls.push(arg)
  }
}

var api = new embedly.Api({'key': opts.key, 'host': opts.host})
api[method](opts.params).
  on('complete', function(objs) { process.stdout.write(JSON.stringify(objs,null,'\t')+'\n') }).
  start()

