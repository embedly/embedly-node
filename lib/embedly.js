/**
 * embedly.js
 * ----------
 *
 * Listed below is the embedly api client implementation.  Please refer to
 * README.rst for example code using this library.
 */

var VERSION="0.6.0"

/**
 * Cast an array-like object to an array.
 */
function cast_array(a) {
  return Array.prototype.slice.call(a)
}

var Hash = require('hashish')
  , http = require('http')
  , https = require('https')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , querystring = require('querystring')
  , urlparse = require('urlparse.js').parse

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
  return urlparse(host)
}

/**
 * A wrapper around http request that collects data and calls back
 * when complete.
 *
 * ex::
 *   var host = parse_host('api.embed.ly')
 *     , r = simple_request(host, 'GET', '/1/services/javascript',
 *           {Host: host.hostname, 'User-Agent': 'Mozilla/5.0 (compatible; myapp/0.1; u@my.com)'})
 *   r.on('complete', function(data) {
 *     services = JSON.parse(data)
 *     console.log(util.inspect(services)
 *   }).on('error', function(error) {
 *     console.log('an error occurred')
 *     console.log(error)
 *   }).start()
 */
var simple_request = function(host, method, path, headers, timeout) {
  host.method = method
  host.path = path
  host.headers = headers
  var type = host.protocol == 'https:' ? https : http
    , request = type.request(host)
    , emitter = new EventEmitter()
    , timeout = timeout || 200000


  log.debug("Calling "+host.protocol+"//"+host.hostname+":"+host.port+path)
  headers['X-Embedly-Client'] = 'embedly-node '+VERSION

  emitter.start = function() {
    request.end()
    /*
    var timer = setTimeout(function req_timeout(){
      emitter.emit('timeout')
      request.abort()
    }, timeout)
    */
    request.on('response', function (response) {
      request.connection.setTimeout(1)
      var data=[]
      response.on('data', function (chunk) {
        data.push(chunk)
      })
      response.on('end', function () {
        //clearTimeout(timer)
        emitter.emit('complete', response, data.join(''))
      })
      response.on('error', function (e) {
        emitter.emit('error', e)
      })
    })
  }

  return emitter
}

/**
 * A simple logging wrapper. We try libraries in the following order:
 *   * log
 *   * node-syslog
 *
 * If none are present we create a noop logger.
 *
 * ex::
 *   var embedly = require('embedly')
 *   embedly.Api.log.debug('hi log!')
 */
try {
  var Log = require('log')
    , level = process.env.EMBEDLY_LOG_LEVEL
    , file = process.env.EMBEDLY_LOG_FILE

  if (!level) {
    level = 1
  }

  if (file) {
    var fs = require('fs')
      , log = new Log(level, fs.createWriteStream(file, {flags: 'a'}))
  } else {
    var log = new Log(level)
  }

  log.warn = log.warning

} catch(e) {
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
    console.log('WARN: `npm install log` for logging.')
    var log = new function() {
      this.log = function() {}
      this.info = function() {}
      this.debug = function() {}
      this.warn = function() {}
      this.error = function() {}
    }
  }
}

/*
 * Class representing the Embedly Api.  Parameters are passed as an object.
 * The following parameters are accepted::
 *   { user_agent: [required]     // ex. 'Mozilla/5.0 (compatible; myapp/1.0; suppoer@myco.com)'
 *   , key: [optional]            // Your embedly api key.  If you use preview or objectify then
 *                                // you will need this.
 *   , host: [optional]           // default is api.embed.ly
 *   }
 */
function Api(opts) {
  if (!opts) {
    opts = {}
  }
  if (!opts['user_agent']) {
    log.warn("You didn't pass a user_agent option to embedly.api's constructor, please pass one in the future")
  }
  this.key = opts['key'] || process.env['EMBEDLY_KEY']
  this.host = opts['host'] || 'api.embed.ly'
  this.user_agent = opts['user_agent'] || 'Mozilla/5.0 (compatible; embedly-node/'+VERSION
  this.api_version = {
      'objectify': 2
    , 'oembed': 1
    , 'preview': 1
  }
  this.timeout = opts['timeout'] || 200000
  this.secure = opts['secure'] || false

  var self = this

  /*
   * Dynamically adding methods for each of the api calls listed
   * in api_version. (oembed, preview, objectify)
   */
  Hash(this.api_version).forEach(function(_, action) {
    self[action] = function(args) {
      return this.apicall(
        {action: action, version: this.api_version[action]}
      , args
      )
    }
  })
}

Api.prototype = new(function() {
  /*
   * Generic api calling mechanism.  You shouldn't need to call
   * this unless you are doing something special.  Instead,
   * oembed, preview and objectify methods should be used.
   *
   * opts are turned into the first two parts of the called URL path. Accepts
   * the following parameters::
   *
   * opts: {
   *     version: [required] // The version of the api call.
   *   , action: [required] // The api action to be called.
   * }
   *
   * params holds urls and any extra url parameters
   *
   *   { urls: [required] // An array of urls to be resolved by embedly
   *   , ... [optional]   // Other url parameters.  Please see pro.embed.ly/docs
   *   }
   *
   * ex::
   *   api.apicall(
   *     'oembed', '1', {
   *         urls: ['http://someurl.com/foobar', 'http://other.com/barfiz']
   *       , maxwidth: 400
   *     }
   *   ).on('complete', function(objs) {
   *       console.log(util.inspect(objs))
   *   }).on('error', function(error, data) {
   *       console.log(error, data);
   *   }).start()
   */
  this.apicall = function(opts, orig_params) {
    var apicall = new EventEmitter()
      , self = this
      , params = Hash.clone(orig_params)

    apicall.start = function() {
      if (!params.urls) {
        params.urls = []
      }
      if (params.url) {
        params.urls.push(params.url)
        delete params['url']
      }

      var services_regex = function(){return self.services_regex()}

      if (self.key) {
        params['key'] = self.key
        // Create a noop since we don't care about services_regex with key
        services_regex = function(){
          var emitter = new EventEmitter()
          emitter.start = function() {emitter.emit('complete')}
          return emitter
        }
      }

      services_regex()
        .on('complete', function apicall_services_complete(sregex) {
          var rejects = []
          if (sregex) {
            params['urls'] = params['urls'].filter(function url_filter(url, i) {
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
              , host = parse_host(self.host, self.secure)

            simple_request(host, 'GET', path+"?"+querystring.stringify(params)
                , {'User-Agent': self.user_agent, 'Host': host.hostname},
                self.timeout)
              .on('complete', function apicall_complete(response, data) {
                try {
                  if (response.statusCode == 200) {
                    var objs = JSON.parse(data)
                    rejects.forEach(function each_reject(reject){
                      objs.splice(reject[0], 0, reject[1])
                    })
                    apicall.emit('complete', objs)
                  } else {
                    apicall.emit('error', data)
                  }
                } catch(e) {
                  apicall.emit('error', e)
                }
              })
              .on('error', function apicall_error(e) {
                apicall.emit('error', e)
              })
              .on('timeout', function apicall_timeout() {
                apicall.emit('timeout')
              })
              .start()
          } else {
            log.warn("no urls fetched")
            apicall.emit('complete', rejects.map(function rejects_map(i){
              return i[1]
            }))
          }
        })
        .on('error', function apicall_services_error(e) {apicall.emit('error', e)})
        .start()
    }

    return apicall
  }

  /**
   * Retrieve the services object from the embedly
   * `services api <http://api.embed.ly/docs/service>`_
   *
   * ex::
   *   api.services().on('complete', function(obj) {
   *     console.log(util.inspect(obj)
   *   }).start()
   */
  this.services = function() {
    var services = new EventEmitter()
      , self = this

    services.start = function() {
      if (this.key) {
        log.warn('services isn\'t available using the pro endpoints')
      }
      if (typeof(this._services) == 'undefined') {
        var host = parse_host(self.host, self.secure)

        simple_request(host, 'GET'
                      , '/1/services/javascript'
                      , {'User-Agent': self.user_agent, 'Host': host.hostname}
                      , self.timeout )
          .on('complete', function services_complete(response, data) {
            try {
              self._services = JSON.parse(data)
              services.emit('complete', self._services)
            } catch(e) {
              services.emit('error', e)
            }
          })
          .on('error', function (e) {services.emit('error', e)})
          .on('timeout', function () {services.emit('timeout')})
          .start()
      } else {
        services.emit('complete', this._services)
      }
    }

    return services
  }

  /**
   * This method isn't needed for Pro calls.  Pro accepts any URL.
   * This method is automatically called to filter urls in apicall
   * for non-Pro calls and shouldn't need to be called directly.
   *
   * Response with a regex to match accepted providers urls against.
   *
   * ex::
   *   urls = [...]  // some urls
   *   api.services_regex().on('complete', function(regex) {
   *     urls.forEach(function(url) {
   *       if (url.matches(regex)) {
   *         // do something
   *       } else {
   *         // do something else
   *       }
   *     })
   *   }).start()
   */
  this.services_regex = function() {
    var regex = new EventEmitter()
      , self = this

    regex.start = function() {
      self.services()
        .on('complete', function services_regex_complete(repl) {
          try {
            var r = new RegExp(repl.map(function(p){
              return p.regex.join("|")
            }).join("|"))
            regex.emit('complete', r)
          } catch(e) {
            regex.emit('error', e)
          }
        })
        .on('error', function services_regex_error(e) {
          regex.emit('error', e)
        })
        .on('timeout', function services_regex_timeout() {
          regex.emit('timeout')
        })
        .start()
    }

    return regex
  }
})

Api.log = log

module.exports =
{ version: VERSION
, Api: Api
, utils:
  { cast_array: cast_array
  , simple_request: simple_request
  , parse_host: parse_host
  }
}
