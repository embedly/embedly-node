/*
 * Feature: Objectify
 *
 *   As an embedly user
 *   I want to call the the embedly api
 *   Because I want to objectify a url
 */

var vows = require('vows')
  , assert = require('assert')
  , Hash = require('hashish')
  , http = require('http')
  , EventEmitter = require('events').EventEmitter
  , path = require('path')


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

function catch_error(e) {
  console.error('an error occurred')
  console.error(e)
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
                            on('error', catch_error).
                            start()
    }
  , 'responsewithservices': function(result) {assert.isTrue(result.length > 10000)}
  }
, '/dev/stdout':
  { topic: function() {path.exists('/dev/stdout', this.callback)}
  , 'exists': function(result) {assert.isTrue(result)}
  }
}).export(module, { error: false })

