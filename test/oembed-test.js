/*
 * Feature: OEmbed
 *
 *   As an embedly user
 *   I want to call the the embedly api
 *   Because I want and oembed for a specific url
 */
var vows = require('vows')
  , assert = require('assert')
  , path = require('path')
  , Syslog = require('node-syslog').Syslog
  , Hash = require('traverse/hash')

Syslog.init("embedly-test", Syslog.LOG_PID | Syslog.LOG_ODELAY, Syslog.LOG_INFO)

require.paths.unshift(path.join(__dirname, '../lib'))

var embedly = require('embedly')

/*
 * HELPERS
 */
/*
 * assert that a response obj arrays properties (names) match
 * an array of expected values.  name can be a period seperated
 * hierarchy of properties.  If the response object is known to
 * be an array of length == 1, or we want to match the same expected
 * value to each obj, then expected can be a string value.
 */
function assertObjValue(name, expected) {
  return function(e, objs) {
    var expect = expected;
    var isString = typeof(expected) == 'string'

    objs.forEach(function(obj,i) {
      // if expected is a string, then the same expected
      // value should be used against all objects
      if (!isString) { expect = expected[i] }
      // this traverses the object hierarchy with name
      var value = name.split('.').reduce(function(o, field) {
        return o[field]
      }, obj)
      assert.equal(value, expect)
    })
  }
}

/*
 *  Scenario Outline: Get the provider_url
 *      Given an embedly endpoint
 *      When oembed is called with the <url> URL
 *      Then the provider_url should be <provider_url>
 */
var oembed_provider_url_vows = {}
/*
 * Examples:
 ** url                                             | provider_url            */
;[" http://www.scribd.com/doc/13994900/Easter       | http://www.scribd.com/  "
, " http://www.scribd.com/doc/28452730/Easter-Cards | http://www.scribd.com/  "
, " http://www.youtube.com/watch?v=Zk7dDekYej0      | http://www.youtube.com/ "
, " http://tweetphoto.com/14784358                  | http://plixi.com        "
].forEach(function(line) {
  var parts = line.split('|')
    , url = parts[0].trim()
    , expected = parts[1].trim()

  oembed_provider_url_vows['when oembed is called for provider with url '+url] = {
    topic: function (api) {
      return api.oembed(
        { params:{'url': url}
        , complete: this.callback
        }
      )
    }
    , 'reponds with expected provider_url': assertObjValue('provider_url', expected)
  }
})

/*
 *  Scenario Outline: Get the types
 *      Given an embedly endpoint
 *      When oembed is called with the <url> URL
 *      Then the type should be <type>
 */
var oembed_type_vows = {}
/*
 * Examples:
 ** url                                             | type  */
;[" http://www.scribd.com/doc/13994900/Easter       | rich  "
, " http://www.scribd.com/doc/28452730/Easter-Cards | rich  "
, " http://www.youtube.com/watch?v=Zk7dDekYej0      | video "
, " http://tweetphoto.com/14784358                  | photo "
].forEach(function(line) {
  var parts = line.split('|')
    , url = parts[0].trim()
    , expected = parts[1].trim()

  oembed_type_vows['when oembed is called for type with url '+url] = {
    topic: function (api) {
      return api.oembed(
        { params:{'url': url}
        , complete: this.callback
        }
      )
    }
    , 'reponds with expected type': assertObjValue('type', expected)
  }
})

/*
 *  Scenario Outline: Get the provider_url with force flag
 *      Given an embedly endpoint
 *      When oembed is called with the <url> URL and force flag
 *      Then the provider_url should be <provider_url>
 */
var oembed_provider_with_force_vows = {}
/*
 * Examples:
 ** url                                        | provider_url            */
;[" http://www.youtube.com/watch?v=Zk7dDekYej0 | http://www.youtube.com/ "
].forEach(function(line) {
  var parts = line.split('|')
    , url = parts[0].trim()
    , expected = parts[1].trim()

  oembed_provider_with_force_vows['when oembed is called with force for provider with url '+url] = {
    topic: function (api) {
      return api.oembed(
        { params:{'url': url, 'force': 'true'}
        , complete: this.callback
        }
      )
    }
    , 'reponds with expected provider_url': assertObjValue('provider_url', expected)
  }
})

/*
 *  Scenario Outline: Get multiple provider_urls
 *      Given an embedly endpoint
 *      When oembed is called with the <urls> URLs
 *      Then provider_url should be <provider_urls>
 */
var oembed_multiple_provider_vows = {}
/*
 * Examples:
 ** urls                                                                                      | provider_urls                                 */
;[" http://www.scribd.com/doc/13994900/Easter,http://www.scribd.com/doc/28452730/Easter-Cards | http://www.scribd.com/,http://www.scribd.com/ "
, " http://www.youtube.com/watch?v=Zk7dDekYej0,http://plixi.com/p/16044847                    | http://www.youtube.com/,http://plixi.com      "
].forEach(function(line) {
  var parts = line.split('|')
    , urls = parts[0].trim()
    , expected = parts[1].trim()

  oembed_multiple_provider_vows['when oembed is called for provider with multi-urls '+urls] = {
    topic: function (api) {
      return api.oembed(
        { params:{'urls': urls.split(','), 'force': 'true'}
        , complete: this.callback
        }
      )
    }
    , 'reponds with expected provider_url': assertObjValue('provider_url', expected.split(','))
  }
})


/*
 *  Scenario Outline: Get the provider_url with pro
 *      Given an embedly endpoint with key
 *      When oembed is called with the <url> URL
 *      Then the provider_url should be <provider_url>
 */
var oembed_pro_provider_vows = {}
/*
 * Examples:
 ** url                                                                              | provider_url               */
;[" http://blog.embed.ly/bob                                                         | http://posterous.com       "
, " http://blog.doki-pen.org/cassandra-rules                                         | http://posterous.com       "
, " http://www.guardian.co.uk/media/2011/jan/21/andy-coulson-phone-hacking-statement | http://www.guardian.co.uk/ "
].forEach(function(line) {
  var parts = line.split('|')
    , url = parts[0].trim()
    , expected = parts[1].trim()

  oembed_pro_provider_vows['when pro oembed is called for provider with url '+url] = {
    topic: function (api) {
      return api.oembed(
        { params:{'url': url}
        , complete: this.callback
        }
      )
    }
    , 'reponds with expected provider_url': assertObjValue('provider_url', expected)
  }
})

/*
 *  Scenario Outline: Attempt to get 404 URL
 *      Given an embedly endpoint
 *      When oembed is called with the <url> URL
 *      Then type should be error
 *      And error_code should be 404
 *      And type should be error
 */
var oembed_404_vows = {}
/*
 * Examples:
 ** url                                                       */
;[" http://www.youtube.com/watch/is/a/bad/url                 "
, " http://www.scribd.com/doc/zfldsf/asdfkljlas/klajsdlfkasdf "
, " http://tweetphoto.com/alsdfldsf/asdfkljlas/klajsdlfkasdf  "
].forEach(function(line) {
  var url = line.trim()

  oembed_404_vows['when oembed is called with a 404 url '+url] = {
    topic: function (api) {
      return api.oembed(
        { params:{'url': url}
        , complete: this.callback
        }
      )
    }
    , 'reponds with expected error_code': assertObjValue('error_code', '404')
    , 'reponds with expected type': assertObjValue('type', 'error')
  }
})

/*
 * Build vows
 */
vows.describe('OEmbed').addBatch({
    'An API instance': Hash({
      topic: new(embedly.api)
    }).
    merge(oembed_provider_url_vows).
    merge(oembed_type_vows).
    merge(oembed_provider_with_force_vows).
    merge(oembed_multiple_provider_vows).
    merge(oembed_404_vows).
    end
  , 'A Pro API Instance': Hash({
      topic: new(embedly.api)({key: process.env.EMBEDLY_KEY})
    }).
    merge(oembed_pro_provider_vows).
    end
}).export(module)
