(function() {
  var cron, twit;

  cron = require('cron');

  twit = require('./twitter');

  twit.twitter();

}).call(this);
