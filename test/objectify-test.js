/*
 * Feature: Objectify
 *
 *   As an embedly user
 *   I want to call the the embedly api
 *   Because I want to objectify a url
 */
require.paths.unshift(require('path').join(__dirname, '../lib'))

var vows = require('vows')
  , embedly = require('embedly')
  , require_either = embedly.utils.require_either
  , assert = require('assert')
  , path = require('path')
  , Hash = require_either('hashish', 'traverse/hash')
  , util = require_either('util', 'utils')

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
  return function(objs) {
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
      assert.ok(canonize_value(value).match(expect))
      assert.equal(canonize_value(value).match(expect).index, 0)
    })
  }
}

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
      return api.objectify({'url': url}).on('complete', this.callback).start()
    }
    , 'reponds with expected metadesc': assertObjValueStartsWith('meta.description', metadesc)
  }
})

/*
 * Build vows
 */
vows.describe('Objectify').addBatch({
    'A Pro API Instance': Hash({
      topic: new(embedly.Api)({key: process.env.EMBEDLY_KEY})
    }).
    merge(objectify_pro_meta_vows).
    end
}).export(module, {error: false})

