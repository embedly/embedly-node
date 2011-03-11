/*
 * Feature: Objectify
 *
 *   As an embedly user
 *   I want to call the the embedly api
 *   Because I want to objectify a url
 */

var path = require('path')

require.paths.unshift(path.join(__dirname, '../lib'))

var embedly = require('embedly')
  , vows = require('vows')
  , assert = require('assert')
  , Hash = embedly.utils.require_either('hashish', 'traverse/hash')
  , util = embedly.utils.require_either('util', 'utils')


/*
 * HELPERS
 */
function canonize_value(val) {
  return (typeof(val) == 'undefined' || val == null) ?
           '' 
         : val
}

/*
 * Build vows
 */
vows.describe('Services').addBatch(
{ 'A Pro API Instance':
  { topic: new(embedly.Api)()
  , 'gets services':
    { topic: function(api) {
        return api.services().on('complete', this.callback).start()
      }
    , 'response with services': function(repl) {
        assert.isTrue(typeof(repl) == 'object')
      }
    }
  , 'gets services regex':
    { topic: function(api) {
        return api.services_regex().on('complete', this.callback).start()
      }
    , 'response with services': function(repl) {
        assert.isTrue(repl instanceof RegExp)
      }
    }
  }
}).export(module, {error: false})

