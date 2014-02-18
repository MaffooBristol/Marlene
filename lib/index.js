(function() {
  var cron, twit;

  cron = require('cron');

  twit = require('./twitter');

  require('dns').resolve('twitter.com', function(err) {
    if (err) {
      console.log("Error! Can't connect to twitter.");
      return process.exit(1);
    }
  });

  twit.twitter();

}).call(this);
