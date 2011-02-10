/*
 * Feature: Objectify
 *
 *   As an embedly user
 *   I want to call the the embedly api
 *   Because I want to objectify a url
 */
var vows = require('vows')
  , assert = require('assert')
  , path = require('path')
  , Hash = require('traverse/hash')
  , util = require('util')

require.paths.unshift(path.join(__dirname, '../lib'))

var embedly = require('embedly')

/*
 * HELPERS
 */
function canonize_value(val) {
  return (typeof(val) == 'undefined' || val == null) ?
           '' 
         : val
}

/*
 * assert that a response obj arrays properties (names) match
 * an array of expected values.  name can be a period seperated
 * hierarchy of properties.  If the response object is known to
 * be an array of length == 1, or we want to match the same expected
 * value to each obj, then expected can be a string value.
 */
function assertObjValueStartsWith(name, expected) {
  return function(e, objs) {
    var expect = expected;
    var isString = typeof(expected) == 'string'

    embedly.log.debug(objs)

    objs.forEach(function(obj,i) {
      // if expected is a string, then the same expected
      // value should be used against all objects
      if (!isString) { expect = expected[i] }
      // this traverses the object hierarchy with name
      var value = name.split('.').reduce(function(o, field) {
        return o[field]
      }, obj)
      assert.ok(canonize_value(value).match(expect))
      assert.equal(canonize_value(value).match(expect).index, 0)
    })
  }
}

/*
 *  Scenario Outline: Get the meta description
 *      Given an embedly endpoint
 *      When objectify is called with the <url> URL
 *      Then the meta.description should start with <metadesc>
 *      And objectify api_version is 1
 */
var objectify_meta_vows = {}
/*
 * Examples:
 ** url                            | metadesc                  */
;[" http://tweetphoto.com/14784358 | Plixi allows users to ins "
].forEach(function(line) {
  var parts = line.split('|')
    , url = parts[0].trim()
    , metadesc = parts[1].trim()

  objectify_meta_vows['when objectify is called for metadesc with url '+url] = {
    topic: function (api) {
      return api.objectify(
        { params:{'url': url}
        , complete: this.callback
        }
      )
    }
    , 'reponds with expected metadesc': assertObjValueStartsWith('meta.description', metadesc)
  }
})

/*
 *  Scenario Outline: Get the meta description with pro
 *      Given an embedly endpoint with key
 *      When objectify is called with the <url> URL
 *      Then the meta.description should start with <metadesc>
 *      And objectify api_version is 2
 */
var objectify_pro_meta_vows = {}
/*
 * Examples:
 ** url                            | metadesc                  */
;[" http://tweetphoto.com/14784358 | Plixi allows users to ins "
].forEach(function(line) {
  var parts = line.split('|')
    , url = parts[0].trim()
    , metadesc = parts[1].trim()

  objectify_pro_meta_vows['when objectify is called on pro for metadesc with url '+url] = {
    topic: function (api) {
      return api.objectify(
        { params:{'url': url}
        , complete: this.callback
        }
      )
    }
    , 'reponds with expected metadesc': assertObjValueStartsWith('meta.description', metadesc)
  }
})

/*
 * Build vows
 */
vows.describe('OEmbed').addBatch({
    'An API instance': Hash({
      topic: new(embedly.api)
    }).
    merge(objectify_meta_vows).
    end
  , 'A Pro API Instance': Hash({
      topic: new(embedly.api)({key: process.env.EMBEDLY_KEY})
    }).
    merge(objectify_pro_meta_vows).
    end
}).export(module)

