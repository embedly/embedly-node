var embedly = require('../index.js'),
    winston = require('winston'),
    logger = new (winston.Logger)({
      transports: [new (winston.transports.Console)({ level: 'info' })]
    });

describe('embedly', function() {
  describe('oembed', function() {
    it('should call the oembed endpoint', function(done) {
      new embedly({key: process.env.EMBEDLY_KEY, logger: logger}, function(err, api) {
        if (!!err) {
          console.error(err.stack);
          console.error(api.text);
        } else {
          api.oembed({urls: ['www.google.com', 'www.yahoo.com', 'http://www.youtube.com/watch?v=-ywcu1rzPik']}, function(err, res) {
            if (!!err) {
              console.error(err.stack);
              console.error(res.text);
            } else {
              console.log(res);
            }
            done(err);
          });
        }
      });
    });
  });
});

