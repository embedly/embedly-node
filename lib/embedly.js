var Hash = require('traverse/hash')
  , qs = require('querystring')
  , http = require('http')
  , _package = require('embedly/package.json')

// Older versions of node call it utils, not util
try {
  var util = require('util')
} catch(e) {
  var util = require('utils')
}

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
    if (typeof(v) != 'string' && typeof(v) != 'number') {
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
    , match = host.match(/^(https?:\/\/)?([^\/:]+)(:\d+)?\/?$/)
    ;

  if (!match) {
    throw new Error('invalid host '+host)
  }

  var hostname = match[2]

  if (match[1] == 'https://') {
    protocol = 'https'
  }

  if (match[3]) {
    port = Number(match[3].substr(1))
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

var simple_request = function(host, method, path, headers, callback) {
  var client = http.createClient(host.port, host.hostname, host.protocol == 'https')
    , request = client.request(method, path, headers)

  log.debug("Calling "+host.protocol+"://"+host.hostname+":"+host.port+path)

  request.end()
  request.on('response', function(response) {
    var data=''
    response.on('data', function (chunk) {
      data += chunk
    })
    response.on('end', function () {
      try {
        callback(null, data)
      } catch(e) {
        callback(e, null)
      }
    })
  })
}

try {
  var Syslog = require('node-syslog').Syslog
  var log = new function() {
    Syslog.init("embedly", Syslog.LOG_PID | Syslog.LOG_ODELAY, Syslog.LOG_INFO)

    this.log = function(level, msg) {
      msg = JSON.stringify(util.inspect(msg))
      Syslog.log(level, msg)
    }
    this.info = function(msg) {
      this.log(Syslog.LOG_INFO, msg)
    }
    this.debug = function(msg) {
      this.log(Syslog.LOG_DEBUG, msg)
    }
    this.warn = function(msg) {
      this.log(Syslog.LOG_WARN, msg)
    }
    this.error = function(msg) {
      this.log(Syslog.LOG_ERROR, msg)
    }
  }
} catch(e) {
  console.log('WARN: `npm install node-syslog@0.6.0` for logging');
  var log = new function() {
    this.log = function() {}
    this.info = function() {}
    this.debug = function() {}
    this.warn = function() {}
    this.error = function() {}
  }
}

/*
 * TODO: doc
 */
this.Api = function(opts) {
  if (!opts) {
    opts = {}
  }
  if (!opts['user_agent']) {
    log.warn("You didn't pass a user_agent option to embedly.api's constructor, please pass one in the future");
  }
  this.key = opts['key']
  this.host = opts['host'] || (this.key ? 'pro.embed.ly' : 'api.embed.ly')
  this.user_agent = opts['user_agent'] || 'Mozilla/5.0 (compatible; embedly-node/'+_package.version
  this.api_version = {
      'objectify': 1
    , 'oembed': 1
    , 'preview': 1
  }

  if (this.key) {
    this.api_version['objectify'] = 2;
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

    var self = this;

    var services_regex = function(callback){self.services_regex(callback)}

    if (this.key) {
      params['key'] = this.key
      services_regex = function(callback){callback()}
    }

    services_regex(function(e, sregex) {
      if (e) {
        args.complete(e, [])
      } else {
        var rejects = []
        if (sregex) {
          params['urls'] = params['urls'].filter(function(url, i) {
            if (!url.match(sregex)) {
              rejects.push([i, {
                  type: 'error'
                , error_code: 401
                , error_message: 'This service requires an Embedly Pro account'
                }
              ])
            } else {
              return true
            }
          })
        }
        if (rejects.length > 0) {
          log.warn("reject count: "+rejects.length)
        } else if (params['urls'].length == 0) {
          log.warn('no urls passed')
        }

        if (params['urls'].length > 0) {
          var path = "/"+opts['version']+"/"+opts['action']
            , host = parse_host(self.host)

          simple_request(host, 'GET', path+"?"+q(params)
            , {'User-Agent': self.user_agent, 'Host': host.hostname}
            , function(e, data) {
              if (e) {
                args.complete(e, data)
              } else {
                try {
                  var objs = JSON.parse(data)
                  rejects.forEach(function(reject){
                    objs.splice(reject[0], 0, reject[1])
                  })
                  args.complete(null, objs)
                } catch(e) {
                  args.complete(e, [])
                }
              }
            }
          )
        } else {
          log.warn("no urls fetched")
          args.complete(null, rejects.map(function(i){return i[1]}))
        }
      }
    })
  }

  this.services = function(oncomplete) {
    if (this.key) {
      log.warn('services isn\'t available using the pro endpoints')
    }
    if (typeof(this._services) == 'undefined') {
      var host = parse_host(this.host)
        , self = this

      simple_request(host, 'GET', '/1/services/javascript'
        , {'User-Agent': self.user_agent, 'Host': host.hostname}
        , function(e, data) {
          if (e) {
            oncomplete(e, data)
          } else {
            try {
              self._services = JSON.parse(data)
              oncomplete(null, self._services)
            } catch(e) {
              oncomplete(e, [])
            }
          }
        }
      )
    } else {
      oncomplete(null, this._services)
    }
  }

  this.services_regex = function(oncomplete) {
    this.services(function(e, services_obj) {
      if (e) {
        oncomplete(e, services_obj)
      } else {
        try {
          var r = new RegExp(services_obj.map(function(p){
            return p.regex.join("|")
          }).join("|"))
          oncomplete(null, r);
        } catch(e) {
          oncomplete(e, null);
        }
      }
    })
  }
})

module.exports = {
   version: _package.version
 , api: this.Api
 , log: log
}
