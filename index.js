var _ = require('lodash'),
    pkg = require('./package.json'),
    request = require('superagent'),
    sprintf = require('sprintf').sprintf,
    hashish = require('hashish'),
    querystring = require('querystring');

function defaultLogger() {
  try {
    var winston = require('winston')
    var logger = new (winston.Logger)({
      transports: [new (winston.transports.Console)({ level: 'error' })]
    });

  } catch(e) {
    function log() {
      console.warn('`npm install winston` or set logger in embedly for logging');
    }
    var logger = {
      debug: _.noop,
      error: _.noop,
      warn: _.noop
    }
  }
  return logger;
}


// ## embedly ##
//
// Create an Embedly api object
//
// ### Options ###
//
// **key** _String_ Embedly consumer key
//
// **secure** _Boolean_ Enables ssl
//
// **logger** _Object_ An object that has debug, warn and error functions that
//            except a single _String_ parameter. The `log` module is used by
//            default.
//
// **servicesRegexp** __RegExp__ A regular expression to match URLs against
//                    before sending them to the Embedly API.
function embedly(opts, callback) {
  this.config = _.merge({
    key: process.env['EMBEDLY_KEY'],
    host: 'api.embed.ly',
    userAgent: 'Mozilla/5.0 (compatible; embedly-node/' + pkg.version + ')',
    apiVersion: {
      objectify: 2,
      oembed: 1,
      preview: 1,
      extract: 1
    },
    timeout: 200000,
    protocol: false,
    logger: null,
    servicesRegExp: null
  }, opts);
  this.initDone = false;
  this.initError = null;

  if (!this.config.logger) {
    this.config.logger = defaultLogger();
  }

  var self = this;
  hashish(this.config.apiVersion).forEach(function(version, action) {
    self[action] = function() {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift(version);
      args.unshift(action);
      return embedly.prototype.apiCall.apply(self, args);
    };
  });
  return self;
}

embedly.prototype._init = function(ctx, fn) {
  if (!this.initDone) {
    this.initDone = true;
    if (!this.config.key && !this.config.servicesRegExp) {
      var url = this.url('services/javascript', '1'),
          errorMsg = 'Failed to fetch /1/services/javascript during init.';

      request
        .get(url)
        .set('User-Agent', this.config.userAgent)
        .set('Accept', 'application/json')
        .end(function(e, res) {
          if (!!e) return fn(ctx, e);
          if (res.status >= 400) {
            self.initError = new Error(errorMsg);
            return fn(ctx, self.initError, res);
          }
          try {
            var services = JSON.parse(res.text),
                regExpText = services.map(function(service) {
                  return service.regex.join("|");
                }).join("|");
            self.config.servicesRegExp = new RegExp(regExpText)
          } catch(e) {
            self.initError = new Error(errorMsg);
            return fn(ctx, self.initError, res);
          }
          return fn(ctx, null, self);
        })

    } else {
      return fn(ctx, null, this);
    }
  } else {
    return fn(ctx, this.initError, this);
  }
};

embedly.prototype.url = function(endpoint, version) {
  var proto = this.config.secure ? 'https' : 'http';

  return sprintf("%s://%s/%s/%s", proto, this.config.host,
      version, endpoint);
};

embedly.prototype.canonizeParams = function(params) {
  if (!params.urls) {
    params.urls = []
  }
  if (!!params.url) {
    params.urls.push(params.url);
    delete params['url'];
  }
  return params;
}

embedly.prototype.matchUrls = function(urls) {
  if (!this.config.servicesRegExp) {
    return urls.slice(0);
  } else {
    return urls.filter(RegExp.prototype.test.bind(this.config.servicesRegExp));
  }
};

embedly.prototype.mockResponse = function(url) {
  return {
    url: url,
    type: 'error',
    error_code: 401,
    error_message: 'URL was filtered via servicesRegExp'
  }
};

embedly.prototype.serializeResponse = function(urls, resText) {
  var passedUrls = this.matchUrls(urls),
      res = JSON.parse(resText),
      self = this;

  return urls.map(function(url) {
    if (passedUrls.indexOf(url) >= 0) {
      return res.shift();
    } else {
      return self.mockResponse(url);
    }
  });
};

embedly.prototype.apiCall = function(endpoint, version, q, fn) {
  // The first parameter to _init is the context. For some reason wrapping
  // them in a closure wasn't working. I gave up do to frustration, but this
  // works.
  this._init({endpoint: endpoint, version: version, q: q, fn: fn}, function(ctx, err, self) {
    if (err) {
      return ctx.fn(err);
    }

    if (!ctx.q.key) {
      ctx.q.key = self.config.key;
    }

    var url = self.url(ctx.endpoint, ctx.version),
        q = self.canonizeParams(ctx.q),
        origUrls = q.urls.slice(0);

    q.urls = self.matchUrls(q.urls);

    if (q.urls.length > 0) {
      self.config.logger.debug('calling: ' + url + '?' + querystring.stringify(q));
      var req = request
        .get(url)
        .set('User-Agent', self.config.userAgent)
        .set('Accept', 'application/json');
      req.query(querystring.stringify(q));
      req.end(function(e, res) {
          if (!!e) return ctx.fn(e)
          if (res.status >= 400) {
            self.config.logger.error(String(res.status), res.text);
            return ctx.fn(new Error('Invalid response'), res.text);
          }
          return ctx.fn(null, self.serializeResponse(origUrls, res.text))
         });
    } else {
      return ctx.fn(null, self.serializeResponse(origUrls, '[]'));
    }
  });
  return q;
};

exports = module.exports = embedly
