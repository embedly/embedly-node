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
    , 'reponds with provider_url': assertObjValue('provider_url', expected)
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
    , 'reponds with type': assertObjValue('type', expected)
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
    , 'reponds with provider_url': assertObjValue('provider_url', expected)
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
    end
  , 'A Pro API Instance': Hash({
      topic: new(embedly.api)({key: process.env.EMBEDLY_KEY})
    }).
    merge(oembed_pro_provider_vows).
    end
}).export(module)

