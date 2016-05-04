embedly
-------

Embedly node client library.  To find out what Embedly is all about, please
visit http://embed.ly.

News
^^^^

* 05/04/2016 - The callback on object creation has been removed. Initialization
is now lazy and happens on the first API call. This is a breaking change if you
used a callback style constructor.
* The embedly-node modules has been updated and simplified. It is not backward
compatible. If you want to stick with the old API, use a verion < 1.0.

Prerequisites
^^^^^^^^^^^^^

* nodejs - Available in most package managers
* `npm <http://npmjs.org/>`_


Installing
^^^^^^^^^^

To install the official latest stable version, please use npm::

  npm install embedly

If you would like cutting edge, then you can clone and install HEAD::

  git clone git@github.com:embedly/embedly-node.git
  cd embedly-node
  npm install

Getting Started
^^^^^^^^^^^^^^^

Here are some examples *hint* replace xxxxxxxxxxx with real key::

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

Authentication
^^^^^^^^^^^^^^

If a key is not specified, the EMBEDLY_KEY environmental variable will be
used. You can signup for an Embedly key at http://embed.ly. Support for
oauth will be added in a future version of the library.

Creating an api object
^^^^^^^^^^^^^^^^^^^^^^

The embedly exported prototype function takes an `Object` of optional
parameters to configure the Embedly API.

 :key: Your Embedly consumer key.
 :proto: The protocol to use when calling Embedly. The default is `http`.
         `https` is also valid.
 :logger: An `Object` that has prototype functions `error` `warn` and `debug`
          that can be invoked with a single string argument.
 :servicesRegexp: A regular expression object to match urls against before
                  sending to the embedly API. Urls sent to an endpoint
                  that don't match will be returned as 401 errors.

There is a second, callback parameter that passes back an error and api
parameter. It is possible in certain circumstances that the embedly api
will fail to initialize properly. Therefore it is recommended to use the
callback function and check for errors, like the example code above.

Endpoints
^^^^^^^^^

Embedly api endpoints are implemented as prototype functions on the api object.
There are two endpoints implemented. See the Embedly API documentation for more
details on the uses of the endpoints.

 * oembed
 * extract

The endpoint functions accept an `Object` or parameters that are, for the most
part, passed directly to the api as query parameters. The api does it's best
to canonize the parameters before sending them. Sending more than 20 URLs at
a time will fail. Future version of this library will batch requests of more
than 20 URLs into batches whose size will be configurable.

Logging
^^^^^^^

`embedly-node` does provide some minimal logging to help diagnose problems. By default, a `winston` console logger with log level `error` will be created, but only if winston is installed. If you'd like more control over logging, you can create your own logger and pass it into embedly on instantiation. ex::

  var embedly = require('embedly'),
      winston = require('winston'),
      logger = new (winston.Logger)({
          transports: [new (winston.transports.Console)({ level: 'info' })]
      });

  new embedly({logger: logger}, function(err, api) {
    // do stuff with api
  });

Testing
^^^^^^^

We have provided some commandline tools to test the Embedly interface.

* `embedly_oembed.js`
* `embedly_extract.js`

Using --help with the commands should give you a good idea of how to use them.


Develop
^^^^^^^

Run tests::

  npm test

Some tests will fail due to missing api key.  Set the EMBEDLY_KEY environmental
variable with your key to get them to pass::

  EMBEDLY_KEY=xxxxxxxxxxxxx npm test


Note on Patches/Pull Requests
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

* Fork the project.
* Make your feature addition or bug fix.
* Add tests for it. This is important so I don't break it in a
  future version unintentionally.
* Commit, do not mess with rakefile, version, or history.
  (if you want to have your own version, that is fine but bump version in a commit by itself I can ignore when I pull)
* Send me a pull request. Bonus points for topic branches.

Copyright
^^^^^^^^^

Copyright (c) 2011 Embed.ly, Inc. See MIT-LICENSE for details.
