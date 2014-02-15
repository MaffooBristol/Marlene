(function() {
  var argv, crypto, db, dbRecord, fs, os, phrases, rollbar, searchTerms, secrets, skip, twit, twitter, util, yaml, _phrases;

  util = require('util');

  os = require('os');

  fs = require('fs');

  twitter = require('twit');

  argv = require('optimist').argv;

  yaml = require('js-yaml');

  rollbar = require('rollbar');

  crypto = require('crypto');

  db = require('mongojs').connect('marlene', ['tweets']);

  secrets = (argv.secrets != null) ? require('../data/' + argv.secrets) : require('../data/secrets.json');

  _phrases = (argv.phrases != null) ? '../data/' + argv.phrases : '../data/phrases.yaml';

  phrases = yaml.safeLoad(fs.readFileSync(require('path').resolve(__dirname, _phrases), 'utf8'));

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
      if (secrets.rollbar != null) {
        rollbar.init(secrets.rollbar);
      } else {
        console.log('Please ');
        rollbar.reportMessage = {};
      }
      rollbar.reportMessage('Initialising Marlene...');
      _phraseNames = Object.keys(phrases.phrases);
      _phraseNamesQuoted = _phraseNames.map(function(a) {
        return '"' + a + '"';
      });
      _randomIndex = parseInt(Math.random() * _phraseNames.length);
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
              rollbar.reportMessage('Already seen tweet, skipping: ' + tweet.user.name + ': ' + tweet.text);
              db.close();
              rollbar.shutdown();
              return;
            }
            if ((argv['dry-run'] != null) || argv.d) {
              console.log('\nYou\'ve set the dry-run flag; tweet NOT sent.');
              rollbar.reportMessage('Dry run: ' + tweet.text + ' / ' + _response);
            } else {
              twit.post('statuses/update', {
                status: '@' + tweet.user.screen_name + ' ' + _response,
                in_reply_to_status_id: tweet.id_str
              }, function(err, data) {
                if (data.id) {
                  dbRecord.sent = true;
                  console.log('Tweet sent to ' + tweet.user.name + '\n');
                  console.log('Replied to ' + tweet.in_reply_to_status_id_str + '\n');
                  return rollbar.reportMessage('Tweet sent to ' + tweet.user.name + ': ' + tweet.text + ' / ' + _response);
                }
              });
            }
            dbRecord.in_reply_to_status_id = tweet.id_str;
            dbRecord.in_reply_to_status_id = tweet.id_str;
            dbRecord.tweet_text = crypto.createHash('md5').update(tweet.text).digest('hex');
            dbRecord.response = crypto.createHash('md5').update(_response).digest('hex');
            dbRecord.trigger = crypto.createHash('md5').update(_trigger).digest('hex');
            dbRecord.complete = Math.round(new Date().getTime() / 100);
            db.tweets.save(dbRecord, function(err) {
              return console.log(err);
            });
            db.close();
            return rollbar.shutdown();
          });
          break;
        }
        return _results;
      });
    }
  };

}).call(this);
