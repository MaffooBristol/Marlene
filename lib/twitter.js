(function() {
  var argv, db, dbRecord, fs, os, phrases, searchTerms, secrets, skip, twit, twitter, util, yaml;

  util = require('util');

  os = require('os');

  fs = require('fs');

  twitter = require('twit');

  argv = require('optimist').argv;

  yaml = require('js-yaml');

  secrets = require('../data/secrets.json');

  phrases = yaml.safeLoad(fs.readFileSync(require('path').resolve(__dirname, '../data/phrases.yaml'), 'utf8'));

  db = require('mongojs').connect('marlene', ['tweets']);

  skip = false;

  dbRecord = {
    started: Math.round(new Date().getTime() / 100),
    hostname: os.hostname(),
    sent: false
  };

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
      twit.get('statuses/mentions_timeline', {
        q: '@teslacool1'
      }, function(err, data) {
        return console.log(data);
      });
      return twit.get('search/tweets', {
        q: _phraseNamesQuoted[_randomIndex]
      }, function(err, data) {
        var tweet, _allResponses, _i, _len, _ref, _response, _results, _trigger;
        if (!((data != null) && (data.statuses != null))) {
          return false;
        }
        _ref = data.statuses;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          tweet = _ref[_i];
          if (tweet.retweeted_status != null) {
            continue;
          }
          if (tweet.text.indexOf('RT') > -1) {
            continue;
          }
          _trigger = _phraseNames[_randomIndex];
          _allResponses = phrases.phrases[_trigger];
          _response = _allResponses[Math.floor(Math.random() * _allResponses.length)];
          console.log(tweet.id + '\n\t\t- Tweet:\t' + tweet.text + '\n\t\t- Trigger:\t' + _trigger + '\n\t\t- Response:\t' + _response);
          db.tweets.find({
            in_reply_to_status_id: tweet.id_str,
            sent: true
          }, function(err, data) {
            if (data.length > 0) {
              console.log('\nAlready seen tweet, skipping.');
              db.close();
              return;
            }
            if ((argv['dry-run'] != null) || argv.d) {
              console.log('\nYou\'ve set the dry-run flag; tweet NOT sent.');
            } else {
              twit.post('statuses/update', {
                status: '@' + tweet.user.screen_name + ' ' + _response,
                in_reply_to_status_id: tweet.id_str
              }, function(err, data) {
                if (data.id) {
                  dbRecord.sent = true;
                  console.log('Tweet sent to ' + tweet.user.name + '\n');
                  return console.log('Replied to ' + tweet.in_reply_to_status_id_str + '\n');
                }
              });
            }
            dbRecord.in_reply_to_status_id = tweet.id_str;
            dbRecord.complete = Math.round(new Date().getTime() / 100);
            db.tweets.save(dbRecord, function(err) {
              return console.log(err);
            });
            return db.close();
          });
          break;
        }
        return _results;
      });
    }
  };

}).call(this);
