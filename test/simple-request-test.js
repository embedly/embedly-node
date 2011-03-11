/*
 * Feature: Objectify
 *
 *   As an embedly user
 *   I want to call the the embedly api
 *   Because I want to objectify a url
 */

var path = require('path')

//require.paths.unshift(path.join(__dirname, '../lib'))

//var embedly_utils = require('embedly').utils
//  , simple_request = embedly_utils.simple_request
//  , parse_host = embedly_utils.parse_host
//  , require_either = embedly_utils.require_either
var vows = require('vows')
  , assert = require('assert')
//  , Hash = require_either('hashish', 'traverse/hash')
//  , util = require_either('util', 'utils')
  , Hash = require('hashish')
  , util = require('util')
  , http = require('http')
  , EventEmitter = require('events').EventEmitter


var simple_request = function(host, method, path, headers, callback) {
  var client = http.createClient(host.port, host.hostname, host.protocol == 'https')
    , request = client.request(method, path, headers)
    , emitter = new EventEmitter()

  emitter.start = function() {
    request.end()
    request.on('response', function(response) {
      var data=''
      response.on('data', function(chunk) {
        data += chunk
      })
      response.on('end', function() {
        emitter.emit('complete', data)
      })
      response.on('error', function(e) {
        emitter.emit('error', e)
      })
    })
  }

  return emitter
}

var parse_host = function(host) {
  var port = 80
    , protocol = 'http'
    , match = host.match(/^(https?:\/\/)?([^\/:]+)(:\d+)?\/?$/)

  if (!match) {
    throw new Error('invalid host '+host)
  }

  var hostname = match[2]

  if (hostname.indexOf(':') != -1){
    port = Number(hostname.substr(hostname.indexOf(':')+1));
    hostname = hostname.substr(0, hostname.indexOf(':'));
  }

  if (match[3]) {
    port = Number(match[3].substr(1))
  } else if (match[1] == 'https://') {
    port = 443
  }

  url = (protocol+"://"+hostname+"/")

  return { 'url': url, 'protocol': protocol, 'hostname': hostname, 'port': port }
}


/*
 * Build vows
 */
vows.describe('Simple Request').addBatch(
{ 'A Url':
  { topic: function(url) {
      var host = parse_host('http://www.google.com/')
      simple_request(host, 'GET', '/', {Host: host.hostname}).
                            on('complete', this.callback).
                            start()
    }
  , 'responsewithservices': function(result) {assert.isTrue(result.length > 10000)}
  }
, '/dev/stdout':
  { topic: function() {path.exists('/dev/stdout', this.callback)}
  , 'exists': function(result) {assert.isTrue(result)}
  }
}).export(module, { error: false })

