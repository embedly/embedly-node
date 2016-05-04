#!/usr/bin/env node

var method = require('path').basename(process.argv[1]).match(/^embedly_([^.]+)(\.js)?$/)[1]
  , embedly = require('../')
  , args = process.argv.slice(2)
  , opts =
    { host: 'api.embed.ly'
    , proto: 'http'
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
    , ' -s, --secure             Use the secure HTTPS embedly endpoint.'
    , ''
    , 'Common Options:'
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
      opts.params[kv[0]] = kv[1]
      break
    case '-s':
    case '--secure':
      opts.proto = 'https';
      break
    default:
      opts.params.urls.push(arg)
  }
}

var api = new embedly(opts);
api[method](opts.params, function(err, res) {
  if (err) {
    process.stderr.write(err.stack);
    process.stderr.write(res);
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(res, null,'  ')+'\n');
});
