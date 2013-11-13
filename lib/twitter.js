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
      var _phraseNames, _phraseNamesQuoted, _randomIndex;
      _phraseNames = Object.keys(phrases.phrases);
      _phraseNamesQuoted = _phraseNames.map(function(a) {
        return '"' + a + '"';
      });
      _randomIndex = parseInt(Math.random() * _phraseNames.length);
      return twit.search(_phraseNames[_randomIndex], {
        include_entities: true
      }, function(data) {
        var tweet, _i, _len, _ref, _response, _results, _trigger;
        _ref = data.statuses;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          tweet = _ref[_i];
          if (tweet.retweeted_status != null) {
            continue;
          }
          _trigger = _phraseNames[_randomIndex];
          _response = phrases.phrases[_trigger][0];
          console.log(tweet.id + '\n\t\t- Tweet:\t' + tweet.text + '\n\t\t- Trigger:\t' + _trigger + '\n\t\t- Response:\t' + _response);
          break;
        }
        return _results;
      });
    }
  };

}).call(this);