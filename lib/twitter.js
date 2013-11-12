(function() {
  var phrases, searchTerms, secrets, twit, twitter, util;

  util = require('util');

  twitter = require('twitter');

  secrets = require('../data/keys.json');

  phrases = require('../data/phrases.json');

  twit = new twitter(secrets);

  searchTerms = (Object.keys(phrases.phrases)).map(function(a) {
    return '"' + a + '"';
  }).join(' OR ');

  module.exports = {
    twitter: function() {
      return twit.search(searchTerms, {
        include_entities: true
      }, function(data) {
        return console.log(util.inspect(data));
      });
    }
  };

}).call(this);
