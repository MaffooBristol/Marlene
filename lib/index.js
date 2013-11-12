(function() {
  var cron, mongo, twit, util;

  cron = require('cron');

  mongo = 'mongojs';

  util = 'util';

  twit = require('./twitter');

  twit.twitter();

}).call(this);
