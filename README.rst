embedly
-------

Embedly node client library.  To find out what Embedly is all about, please
visit http://embed.ly.  To see our api documentation, visit
http://api.embed.ly/docs.

Prerequisites
^^^^^^^^^^^^^

* nodejs - Available in most package managers
* `npm <http://npmjs.org/>`_ - If you have no idea how to install it for a dev
  environment, feel free to check about `my blog
  <http://blog.doki-pen.org/installing-nodejs-npm-sanely>`_ about it.  I'm not
  trying to self-promote, I just really couldn't find any simple instructions. 


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

Here are some examples::

  var embedly = require('embedly')
    , require_either = embedly.utils.require_either
    , util = require_either('util', 'utils')
    , Api = embedly.Api
    , api = new Api({user_agent: 'Mozilla/5.0 (compatible; myapp/1.0; u@my.com)'})


  // call single url
  api.oembed({url: 'http://www.youtube.com/watch?v=Zk7dDekYej0'}).on('complete', function(objs) {
    console.log('--------------------------------------------------------------')
    console.log('1. ')
    console.log(util.inspect(objs[0]))
  }).start()

  // call multiple urls with parameters
  api.oembed(
    { urls: ['http://www.youtube.com/watch?v=Zk7dDekYej0', 'http://plixi.com/p/16044847']
    , maxWidth: 450
    , wmode: 'transparent'
    , method: 'after'
    }
  ).on('complete', function(objs) {
    console.log('--------------------------------------------------------------')
    console.log('2. ')
    console.log(util.inspect(objs))
  }).start()

  // call pro with key (you'll need a real key)
  pro = new Api({key: 'xxxxxxxxxxxx', user_agent: 'Mozilla/5.0 (compatible; myapp/1.0; u@my.com)'})
  pro.preview({url: 'http://www.guardian.co.uk/media/2011/jan/21/andy-coulson-phone-hacking-statement'}).
    on('complete', function(objs) {
      console.log('--------------------------------------------------------------')
      console.log('3. ')
      console.log(util.inspect(objs[0]))
    }).start()

Configuration
^^^^^^^^^^^^^

If `log` library is used for logging, then logging can be configured via
environmental variables.  Log levels are described on the `visionmedia/log.js
<https://github.com/visionmedia/log.js>`_ website and are defined with the
EMBEDLY_LOG_LEVEL variable::

  export EMBEDLY_LOG_LEVEL="debug"
  npm test

By default, logging will happen on stdout out.  To get it to a file, use
the EMBEDLY_LOG_FILE variable.  Make sure the path to the file exists
and permissions are correct::

  export EMBEDLY_LOG_LEVEL="debug"
  export EMBEDLY_LOG_FILE="embedly.log"
  npm test
  cat embedly.log

node-syslog is also supported, although I've had bad luck with it.  Try
version 0.6.0.  Check /var/log/messages on most systems.

Here is a simple configuration that I use on my dev box (syslog-ng)::

  # doki_pen is my username
  destination messages { file("/var/log/messages"); };
  destination embedly { file("/var/log/embedly-node" owner(doki_pen) group(doki_pen)); };
  filter f_embedly { program(embedly); };
  filter f_not_embedly { not program(embedly); };
  log { source(src); filter(f_embedly); destination(embedly); };
  log { source(src); filter(f_not_embedly); destination(messages); };
  log { source(src); filter(f_not_embedly); destination(console_all); };

This puts embedly logs in /var/log/embedly-node with good permissions and 
keeps them out of /var/log/messages.  I'm no master of syslog-ng, so buyer
beware.

Testing
^^^^^^^

We have provided some commandline tools to test the Embedly interface.

* `embedly_oembed.js`
* `embedly_objectify.js`
* `embedly_preview.js`

Using --help with the commands should give you a good idea of how to use them.


Develop
^^^^^^^

Run link::
  
  npm link

Run tests::

  npm test

Some tests will fail due to missing pro key.  Set the EMBEDLY_KEY environmental
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
