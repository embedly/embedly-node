/**
 * embedly.js
 * ----------
 *
 * Listed below is the embedly api client implementation.  Please refer to
 * README.rst for example code using this library.
 */

/**
 * Cast an array-like object to an array.
 */
function cast_array(a) {
  return Array.prototype.slice.call(a)
}

/**
 * Try to load each module in order, returning when successful.
 * This is used to require modules that changed names between node
 * versions.
 *
 * ex. require_either('util', 'utils')
 */
function require_either() {
  // turn arguments into an array
  var args = cast_array(arguments)
  var libname = args.shift()

  while (libname) {
    try {
      var lib = require(libname)
      return lib
    } catch(e) {
      libname = args.shift()
    }
  }
  throw new Error('Cannot find modules '+cast_array(arguments))
}

var Hash = require_either('hashish', 'traverse/hash')
  , qs = require('querystring')
  , http = require('http')
  , _package = require('../')
  , EventEmitter = require('events').EventEmitter
  , util = require_either('util', 'utils')
  , querystring = require('querystring')

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
var simple_request = function(host, method, path, headers, callback) {
  var client = http.createClient(host.port, host.hostname, host.protocol == 'https')
    , request = client.request(method, path, headers)
    , emitter = new EventEmitter()

  log.debug("Calling "+host.protocol+"://"+host.hostname+":"+host.port+path)
  headers['X-Embedly-Client'] = 'embedly-node '+_package.version

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
      , log = new Log(level, fs.createWriteStream(file, {flags: 'a'}));
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
    console.log('WARN: `npm install log for logging.  For configuration, refer to '+_package.homepage);
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
 *   , key: [optional]            // Your embedly PRO key.  If you use preview or objectify then
 *                                // you will need this.
 *   , host: [optional]           // The embedly host.  If a key is provided, then 'pro.embed.ly'
 *                                // is used, otherwise 'api.embed.ly' is used.
 *   }
 */
function Api(opts) {
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
      'objectify': 2
    , 'oembed': 1
    , 'preview': 1
  }

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
  this.apicall = function(opts, params) {
    var apicall = new EventEmitter()
      , self = this

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
        // Create a noop since we don't care about services_regex with pro
        services_regex = function(){
          var emitter = new EventEmitter()
          emitter.start = function() {emitter.emit('complete')}
          return emitter
        }
      }

      services_regex().on('complete', function(sregex) {
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

          simple_request(host, 'GET', path+"?"+querystring.stringify(params)
              , {'User-Agent': self.user_agent, 'Host': host.hostname}).
            on('complete', function(data) {
              try {
                var objs = JSON.parse(data)
                rejects.forEach(function(reject){
                  objs.splice(reject[0], 0, reject[1])
                })
                apicall.emit('complete', objs)
              } catch(e) {
                apicall.emit('error', e)
              }
            }).
            on('error', function(e) {
              apicall.emit('error', e)
            }).
            start()
        } else {
          log.warn("no urls fetched")
          apicall.emit('complete', rejects.map(function(i){return i[1]}))
        }
      }).
      on('error', function(e) {apicall.emit('error', e)}).
      start()
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
        var host = parse_host(self.host)

        simple_request(host, 'GET', '/1/services/javascript'
          , {'User-Agent': self.user_agent, 'Host': host.hostname}).
          on('complete', function(data) {
            try {
              self._services = JSON.parse(data)
              services.emit('complete', self._services)
            } catch(e) {
              services.emit('error', e)
            }
          }).
          on('error', function(e) {services.emit('error', e)}).
          start()
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
      self.services().on('complete', function(repl) {
        try {
          var r = new RegExp(repl.map(function(p){
            return p.regex.join("|")
          }).join("|"))
          regex.emit('complete', r);
        } catch(e) {
          regex.emit('error', e);
        }
      }).
      on('error', function(e) {regex.emit('error', e)}).
      start()
    }

    return regex
  }
})

Api.log = log

module.exports =
{ version: _package.version
, Api: Api
, utils: 
  { cast_array: cast_array
  , require_either: require_either
  , simple_request: simple_request
  , parse_host: parse_host
  }
}
