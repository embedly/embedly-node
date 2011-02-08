var Hash = require('traverse/hash')
  , qs = require('querystring')
  , http = require('http')
  , Syslog = require('node-syslog').Syslog

Syslog.init("embedly", Syslog.LOG_PID | Syslog.LOG_ODELAY, Syslog.LOG_INFO)

/**
 * Like qs.stringify, except that Array parameters are combined with
 * an unescaped comma instead of split up of many paramters.
 *
 * ex.
 *
 * > q({urls:
 *   ['http://youtube.com/watch/video1', 'http://youtube.com/watch/video2'],
 *   key: 'xxxx'})
 *
 * 'urls=http%3A%2F%2Fyoutube.com%2Fwatch%2Fvideo1,http%3A%2F%2Fyoutube.com%2Fwatch%2Fvideo2&key=xxxx'
 */
var q = function(params) {
  return Hash(params).map(function(v,k) {
    if (typeof(v) != 'string') {
      return k+"="+v.map(function(p){return qs.escape(String(p))}).join(',')
    } else {
      return k+"="+qs.escape(v)
    }
  }).values.join('&');
}

/* Flexibly parse host strings.
 *
 * Returns a hash of
 * { protocol:
 * , host:
 * , port:
 * , url:
 * }
 */
var parse_host = function(host) {
  var port = 80
    , protocol = 'http'
    , match = host.match(/^(https?:\/\/)?([^\/]+)(:\d+)?\/?$/)
    ;

  if (!match) {
    throw new Error('invalid host '+host)
  }

  var hostname = match[2]

  if (match[1] == 'https://') {
    protocol = 'https'
  }

  if (match[3]) {
    port = Number(match[3])
  } else if (match[1] == 'https://') {
    port = 443
  }

  var portpart = ""
  if (match[3]) {
    portpart = ":"+match[3]
  }

  url = (protocol+"://"+hostname+portpart+"/")
  return { 'url': url, 'protocol': protocol, 'hostname': hostname, 'port': port }
}

/*
 * TODO: doc
 */
this.Api = function(opts) {
  if (!opts) {
    opts = {}
  }
  this.key = opts['key']
  this.host = opts['host'] || (this.key ? 'pro.embed.ly' : 'api.embed.ly')
  this.user_agent = opts['user_agent'] || 'Mozilla/5.0 (compatible; embedly-node/0.1.0'
  this.api_version = {
      'objectify': 2
    , 'oembed': 1
    , 'preview': 1
  }
  var self = this

  Hash(this.api_version).forEach(function(_, action) {
    self[action] = function(args) {
      this.apicall(
        {action: action, version: this.api_version[action]}
      , args
      )
    }
  })
}

this.Api.prototype = new(function() {
  /* TODO: doc */
  this.apicall = function(opts, args) {
    var params = args['params']
    if (!params.urls) {
      params.urls = []
    }
    if (params.url) {
      params.urls.push(params.url)
      delete params['url']
    }

    if (this.key) {
      params['key'] = this.key
    }
    var path = "/"+opts['version']+"/"+opts['action']
      , host = parse_host(this.host)
      , client = http.createClient(host.port, host.hostname, host.protocol == 'https')

    Syslog.log(Syslog.LOG_DEBUG, "Calling "+
        host.protocol+"://"+host.hostname+":"+host.port+path+"?"+q(params))

    var request = client.request('GET', path+"?"+q(params),
      {'User-Agent': this.user_agent, 'Host': host.hostname})
    request.end();
    request.on('response', function(response) {
      var data=''
      response.on('data', function (chunk) {
        data += chunk
      })
      response.on('end', function () {
        try {
          var objs = JSON.parse(data)
          // TODO: this is a crappy way to test if it's an array
          if (!objs['forEach']) {
            objs = [objs]
          }
          args.complete(null, objs)
        } catch(e) {
          args.complete(e, [])
        }
      })
    })
  }
})

module.exports = {
   version: '0.1.0'
 , api: this.Api
}
