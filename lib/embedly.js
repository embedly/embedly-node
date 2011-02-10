var Hash = require('traverse/hash')
  , qs = require('querystring')
  , http = require('http')
  , Syslog = require('node-syslog').Syslog
  , util = require('util')

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

var simple_request = function(host, method, path, headers, callback) {
  var client = http.createClient(host.port, host.hostname, host.protocol == 'https')
    , request = client.request(method, path, headers)

  Syslog.log(Syslog.LOG_DEBUG, "Calling "+
      host.protocol+"://"+host.hostname+":"+host.port+path)

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
  if (!this.key) {
    this.api_version['objectify'] = 1
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
          Syslog.log(Syslog.LOG_DEBUG, "Returning all rejects")
          args.complete(null, rejects.map(function(i){Syslog.log(Syslog.LOG_DEBUG, util.inspect(i[1])); return i[1]}))
        }
      }
    })
  }

  this.services = function(oncomplete) {
    if (this.key) {
      Syslog.log(Syslog.LOG_WARN, 'services isn\'t available using the pro endpoints')
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
   version: '0.1.0'
 , api: this.Api
}
