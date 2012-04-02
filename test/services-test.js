/*
 * Feature: Objectify
 *
 *   As an embedly user
 *   I want to call the the embedly api
 *   Because I want to objectify a url
 */

var embedly = require('../')
  , vows = require('vows')
  , assert = require('assert')
  , Hash = require('hashish')


/*
 * HELPERS
 */
function canonize_value(val) {
  return (typeof(val) == 'undefined' || val == null) ?
           ''
         : val
}

function catch_error(e) {
  console.error('an error occurred')
  console.error(e)
}

/*
 * Build vows
 */
vows.describe('Services').addBatch(
{ 'An API Instance':
  { topic: new(embedly.Api)({key: null})
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

