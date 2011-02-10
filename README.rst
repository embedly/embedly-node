embedly
-------

Embedly node client library.  To find out what Embedly is all about, please
visit `http://embed.ly`_.  To see our api documentation, visit
`http://api.embed.ly/docs`_.

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
    , util = require('util')

  api = new embedly.api()

  # single url
  var objs = api.oembed({url: 'http://blog.embed.ly'})

  console.log(util.inspect(obj[0])

  # multiple urls with opts
  objs = api.oembed({
    urls: ['http://blog.embed.ly', 'http://blog.doki-pen.org'],
    maxWidth: 450,
    wmode: 'transparent',
    method: 'after'
  })
  console.log(util.inspect(objs))

  # call pro with key (you'll need a real key)
  pro = new embedly.api({key: 'xxxxxxxxxxxxxxxxxxxxxxxxxx'})
  objs = pro.preview({url:
    'http://www.guardian.co.uk/media/2011/jan/21/andy-coulson-phone-hacking-statement'})
  console.log(util.inspect(objs[0]))

Testing
^^^^^^^

Run vows::

  vows

Some tests will fail due to missing pro key.  Set the EMBEDLY_KEY environmental
variable with your key to get them to pass::

  EMBEDLY_KEY=xxxxxxxxxxxxx vows

We have provided some commandline tools to test the Embedly interface.

* `embedly_oembed.js`
* `embedly_objectify.js`
* `embedly_preview.js`

Using --help with the commands should give you a good idea of how to use them.

Logging
^^^^^^^

We are using syslog for logging.  Check /var/log/messages on most systems.

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
