(function() {
  var argv, crypto, db, dbRecord, fs, moment, os, phrases, rollbar, secrets, skip, twitter, util, yaml, _phrases;

  util = require('util');

  os = require('os');

  fs = require('fs');

  twitter = require('twit');

  argv = require('optimist').argv;

  yaml = require('js-yaml');

  rollbar = require('rollbar');

  crypto = require('crypto');

  moment = require('moment');

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

  module.exports = {
    parseResponse: function(text) {
      text = text.replace('[name]', this.myName);
      return text;
    },
    finalise: function(_exitCode) {
      _exitCode = _exitCode || 0;
      console.log('Shutting down...');
      db.close();
      rollbar.shutdown();
      if (_exitCode === 0) {
        console.log('Done! Everything seemed to go okay :)');
      } else {
        console.log("Done... but something went horribly wrong, it seems :(");
      }
      process.exit(_exitCode);
    },
    saveDBRecord: function(tweet, _trigger, _response) {
      dbRecord.in_reply_to_status_id = tweet.id_str;
      dbRecord.tweet_text = crypto.createHash('md5').update(tweet.text).digest('hex');
      dbRecord.response = crypto.createHash('md5').update(_response).digest('hex');
      dbRecord.trigger = crypto.createHash('md5').update(_trigger).digest('hex');
      dbRecord.complete = Math.round(new Date().getTime() / 100);
      db.tweets.save(dbRecord, function(err) {
        return console.log(err);
      });
      return console.log('Saved DB Record.');
    },
    sendTweet: function(tweet, _trigger, _response) {
      var _self;
      _self = this;
      _response = this.parseResponse(_response);
      console.log('\n\t- Unique ID:\t' + tweet.id + '\n\t- Tweet:\t' + tweet.text.replace('\n', '') + '\n\t- Trigger:\t' + _trigger + '\n\t- Response:\t' + _response);
      return db.tweets.find({
        in_reply_to_status_id: tweet.id_str,
        sent: true
      }, function(err, data) {
        if ((data != null) && data.length > 0) {
          console.log('\nAlready seen tweet, skipping.');
          rollbar.reportMessage('Already seen tweet, skipping: ' + tweet.user.name + ': ' + tweet.text);
          _self.finalise;
          return;
        }
        if ((argv['dry-run'] != null) || argv.d) {
          console.log('\nYou\'ve set the dry-run flag; tweet NOT sent.');
          rollbar.reportMessage('Dry run: ' + tweet.text + ' / ' + _response);
          _self.saveDBRecord(tweet, _trigger, _response);
          return _self.finalise();
        } else {
          return _self.twit.post('statuses/update', {
            status: '@' + tweet.user.screen_name + ' ' + _response,
            in_reply_to_status_id: tweet.id_str
          }, function(err, data) {
            if (data.id) {
              dbRecord.sent = true;
              console.log('Tweet sent to ' + tweet.user.name + '\n');
              console.log('Replied to ' + tweet.in_reply_to_status_id_str + '\n');
              rollbar.reportMessage('Tweet sent to ' + tweet.user.name + ': ' + tweet.text + ' / ' + _response);
              _self.saveDBRecord(tweet, _trigger, _response);
              return _self.finalise();
            }
          });
        }
      });
    },
    twitter: function() {
      var _phraseNames, _phraseNamesQuoted, _randomIndex, _self;
      _self = this;
      _self.twit = new twitter(secrets);
      _self.timeoutCounter = setTimeout(function() {
        console.log("(5s) It's all taking rather a long time...");
        clearTimeout(_self.timeoutCounter);
        return _self.timeoutCounter = setTimeout(function() {
          console.log("(15s) Fuck this shit, aborting...");
          clearTimeout(_self.timeoutCounter);
          return _self.finalise();
        }, 10000);
      }, 5000);
      if (secrets.rollbar != null) {
        rollbar.init(secrets.rollbar, {
          level: 'debug'
        });
        rollbar.errorHandler(secrets.rollbar);
        rollbar.handleUncaughtExceptions();
      } else {
        rollbar.reportMessage = function() {};
      }
      rollbar.reportMessage('Initialising Marlene...');
      _phraseNames = Object.keys(phrases.phrases);
      _phraseNamesQuoted = _phraseNames.map(function(a) {
        return '"' + a + '"';
      });
      _randomIndex = parseInt(Math.random() * _phraseNames.length);
      return _self.twit.get('account/verify_credentials', function(err, data) {
        var _error;
        if (err) {
          _error = 'Error! [' + err.statusCode + '] ' + err.message;
          console.log(_error);
          throw new Error(_error);
          return;
        }
        console.log('Running Marlene as ' + data.name + '.');
        _self.myName = data.name;
        _self.twit.get('statuses/mentions_timeline', {
          count: 100
        }, function(err, data) {
          var mention, reply, trigger, _i, _len, _now, _response, _results, _then;
          if (err) {
            _error = 'Error! [' + err.statusCode + '] ' + err.message;
            console.log(_error);
            throw new Error(_error);
            return;
          }
          _results = [];
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            mention = data[_i];
            _results.push((function() {
              var _j, _len1, _ref, _results1;
              _ref = phrases.replies;
              _results1 = [];
              for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
                reply = _ref[_j];
                _results1.push((function() {
                  var _k, _len2, _ref1, _results2;
                  _ref1 = reply.triggers;
                  _results2 = [];
                  for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
                    trigger = _ref1[_k];
                    if (mention.text.toLowerCase().indexOf(trigger.toLowerCase()) > -1) {
                      _response = reply.responses[Math.floor(Math.random() * reply.responses.length)];
                      _now = moment();
                      _then = moment(mention.created_at);
                      if (_now.diff(_then, 'days') < 7) {
                        _results2.push(_self.sendTweet(mention, trigger, _response));
                      } else {
                        _results2.push(void 0);
                      }
                    } else {
                      _results2.push(void 0);
                    }
                  }
                  return _results2;
                })());
              }
              return _results1;
            })());
          }
          return _results;
        });
        return _self.twit.get('search/tweets', {
          q: _phraseNamesQuoted[_randomIndex]
        }, function(err, data) {
          var tweet, _allResponses, _i, _len, _ref, _response, _results, _trigger;
          if (err) {
            _error = 'Error! [' + err.statusCode + '] ' + err.message;
            console.log(_error);
            throw new Error(_error);
            return;
          }
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
            _self.sendTweet(tweet, _trigger, _response);
            break;
          }
          return _results;
        });
      });
    }
  };

}).call(this);
