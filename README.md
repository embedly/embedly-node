# embedly

Embedly node client library. To find out what Embedly is all about,
please visit <http://embed.ly>.

## News

\* 05/04/2016 - The callback on object creation has been removed.
Initialization is now lazy and happens on the first API call. This is a
breaking change if you used a callback style constructor. \* The
embedly-node modules has been updated and simplified. It is not backward
compatible. If you want to stick with the old API, use a verion \< 1.0.

## Prerequisites

  - nodejs - Available in most package managers
  - [npm](http://npmjs.org/)

## Installing

To install the official latest stable version, please use npm:

    npm install embedly

If you would like cutting edge, then you can clone and install HEAD:

    git clone git@github.com:embedly/embedly-node.git
    cd embedly-node
    npm install

## Getting Started

Here are some examples *hint* replace xxxxxxxxxxx with real key:
```javascript
var EMBEDLY_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxx';

var embedly = require('embedly'),
    util = require('util');

var api = new embedly({key: EMBEDLY_KEY});
// call single url
var url = 'http://www.youtube.com/watch?v=Zk7dDekYej0';
api.oembed({url: url}, function(err, objs) {
  if (!!err) {
    console.error('request #1 failed');
    console.error(err.stack, objs);
    return;
  }
  console.log('---------------------------------------------------------');
  console.log('1. ');
  console.log(util.inspect(objs[0]));
});

// call multiple urls with parameters
var urls = ['http://www.youtube.com/watch?v=Zk7dDekYej0',
            'http://plixi.com/p/16044847'],
    opts = { urls: urls,
             maxWidth: 450,
             wmode: 'transparent',
             method: 'after' };

api.oembed(opts, function(err, objs) {
    if (!!err) {
      console.error('request #2 failed');
      console.error(err.stack, objs);
      return;
    }
    console.log('-------------------------------------------------------');
    console.log('2. ');
    console.log(util.inspect(objs));
});

var api = new embedly({key: EMBEDLY_KEY});
var url = ('http://www.guardian.co.uk/media/2011/jan' +
           '/21/andy-coulson-phone-hacking-statement');
api.preview({url: url}, function(err, objs) {
  if (!!err) {
    console.error('request #2 failed');
    console.error(err.stack, objs);
    return;
  }
  console.log('---------------------------------------------------------');
  console.log('3. ');
  console.log(util.inspect(objs[0]));
});
```

## Authentication

If a key is not specified, the EMBEDLY\_KEY environmental variable will
be used. You can signup for an Embedly key at <http://embed.ly>. Support
for oauth will be added in a future version of the library.

## Creating an api object

The embedly exported prototype function takes an Object of optional
parameters to configure the Embedly API.

>   - key  
>     Your Embedly consumer key.
> 
> :pro
