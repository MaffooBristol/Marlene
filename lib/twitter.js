(function() {
  var argv, clc, crypto, db, dbRecord, emphasise, error, fs, moment, notice, os, phrases, restler, rollbar, secrets, skip, twitter, util, warn, yaml, _phrases;

  util = require('util');

  os = require('os');

  fs = require('fs');

  twitter = require('twit');

  argv = require('optimist').argv;

  yaml = require('js-yaml');

  rollbar = require('rollbar');

  crypto = require('crypto');

  moment = require('moment');

  clc = require('cli-color');

  restler = require('restler');

  db = require('mongojs').connect('marlene', ['tweets']);

  if (argv.test) {
    console.log(" > No testing platform yet, so let's say it's all okay ;)");
    process.exit(0);
  }

  secrets = (argv.secrets != null) ? require('../data/' + argv.secrets) : require('../data/secrets.json');

  _phrases = (argv.phrases != null) ? '../data/' + argv.phrases : '../data/phrases.yaml';

  phrases = yaml.safeLoad(fs.readFileSync(require('path').resolve(__dirname, _phrases), 'utf8'));

  skip = false;

  dbRecord = {
    started: Math.round(new Date().getTime() / 100),
    hostname: os.hostname(),
    sent: false
  };

  error = clc.red.bold;

  warn = clc.yellow;

  notice = clc.blue;

  emphasise = clc.bold;

  module.exports = {
    parseResponse: function(text) {
      text = text.replace('[name]', this.myName);
      return text;
    },
    finalise: function(_exitCode) {
      _exitCode = _exitCode || 0;
      console.log(' > Shutting down...');
      db.close();
      rollbar.shutdown();
      if (_exitCode === 0) {
        console.log(' > Done! Everything seemed to go okay :)\n');
      } else {
        console.log(" > Done... but something went horribly wrong, it seems :(\n");
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
      return console.log(' > Saved DB Record.');
    },
    sendTweet: function(tweet, _trigger, _response, _noFinalise) {
      var _self;
      _self = this;
      _noFinalise = _noFinalise || false;
      _response = this.parseResponse(_response);
      return db.tweets.find({
        in_reply_to_status_id: tweet.id_str,
        sent: true
      }, function(err, data) {
        console.log('\n > - Unique ID:\t' + tweet.id + '\n > - Trigger:\t' + _trigger + '\n > - Tweet:\t' + tweet.text.replace('\n', '') + '\n > - Response:\t' + emphasise(_response) + '\n');
        if ((data != null) && data.length > 0) {
          console.log(' > Already seen tweet, skipping.');
          rollbar.reportMessage('Already seen tweet, skipping: ' + tweet.user.name + ': ' + tweet.text);
          if (!_noFinalise) {
            _self.finalise();
          }
          return;
        }
        if ((argv['dry-run'] != null) || argv.d) {
          console.log(' > You\'ve set the dry-run flag; tweet NOT sent.');
          rollbar.reportMessage('Dry run: ' + tweet.text + ' / ' + _response);
          _self.saveDBRecord(tweet, _trigger, _response);
          if (!_noFinalise) {
            return _self.finalise();
          }
        } else {
          return _self.twit.post('statuses/update', {
            status: '@' + tweet.user.screen_name + ' ' + _response,
            in_reply_to_status_id: tweet.id_str
          }, function(err, data) {
            if (data.id) {
              dbRecord.sent = true;
              console.log(' > Tweet sent to ' + tweet.user.name + ' (@' + tweet.user.screen_name + ') / ' + (tweet.in_reply_to_status_id || tweet.in_reply_to_status_id_str));
              rollbar.reportMessage('Tweet sent to ' + tweet.user.name + ': ' + tweet.text + ' / ' + _response);
              _self.saveDBRecord(tweet, _trigger, _response);
              if (!_noFinalise) {
                return _self.finalise();
              }
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
        console.log(" > (5s) It's all taking rather a long time...");
        clearTimeout(_self.timeoutCounter);
        return _self.timeoutCounter = setTimeout(function() {
          console.log(error(" > (15s) Fuck this shit, aborting..."));
          clearTimeout(_self.timeoutCounter);
          return _self.finalise(1);
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
          console.log(' > ' + _error);
          throw new Error(_error);
          return;
        }
        console.log(' > Running Marlene as ' + data.name + '.');
        _self.myName = data.name;
        _self.myScreenName = data.screen_name;
        if (argv.method == null) {
          argv.method = 'intrude';
        }
        switch (argv.method) {
          case 'reply':
            return _self.twit.get('statuses/mentions_timeline', {
              count: 100
            }, function(err, data) {
              var mention, reply, trigger, _i, _j, _k, _len, _len1, _len2, _now, _ref, _ref1, _response, _then;
              if (err) {
                _error = 'Error! [' + err.statusCode + '] ' + err.message;
                console.log(' > ' + _error);
                throw new Error(_error);
                return;
              }
              for (_i = 0, _len = data.length; _i < _len; _i++) {
                mention = data[_i];
                _ref = phrases.replies;
                for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
                  reply = _ref[_j];
                  _ref1 = reply.triggers;
                  for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
                    trigger = _ref1[_k];
                    if (mention.text.toLowerCase().indexOf(trigger.toLowerCase()) > -1) {
                      _response = reply.responses[Math.floor(Math.random() * reply.responses.length)];
                      _now = moment();
                      _then = moment(mention.created_at);
                      if (_now.diff(_then, 'days') < 7) {
                        _self.sendTweet(mention, trigger, _response);
                        return;
                      }
                    }
                  }
                }
              }
            });
          case 'observe':
            _self.userStream = _self.twit.stream('statuses/filter', {
              track: '@' + _self.myScreenName,
              replies: 'all'
            });
            console.log(' > Observing direct mentions...');
            clearTimeout(_self.timeoutCounter);
            return _self.userStream.on('tweet', function(tweet) {
              var i, j, k, _i, _j, _k, _len, _len1, _output, _ref, _ref1, _ref2, _response, _text;
              if (_self.timeoutCounter._idleTimeout > -1) {
                clearTimeout(_self.timeoutCounter);
              }
              _text = tweet.text.replace("\n", '');
              _output = ' > ';
              _output += tweet.user.name;
              for (i = _i = 0, _ref = 14 - tweet.user.screen_name.length; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
                _output += ' ';
              }
              console.log(_output + _text);
              _ref1 = phrases.replies;
              for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
                j = _ref1[_j];
                _ref2 = j.triggers;
                for (_k = 0, _len1 = _ref2.length; _k < _len1; _k++) {
                  k = _ref2[_k];
                  if (!(_text.toLowerCase().indexOf(k.toLowerCase()) > -1)) {
                    continue;
                  }
                  console.log('\n > Matched on ' + emphasise(k));
                  rollbar.reportMessage('Matched on ' + k);
                  _response = j.responses[Math.floor(Math.random() * j.responses.length)];
                  if (secrets.restler_url != null) {
                    console.log(' > Sending webhook to Zapier via Restler');
                    restler.post(secrets.restler_url, {
                      data: {
                        tweet: tweet,
                        trigger: k,
                        response: _response
                      }
                    });
                  }
                  console.log(' > Parrying mention/direct reply...');
                  _self.sendTweet(tweet, k, _response, true);
                  return;
                }
              }
            });
          case 'intrude':
            console.log(' > Intruding...');
            return _self.twit.get('search/tweets', {
              q: _phraseNamesQuoted[_randomIndex]
            }, function(err, data) {
              var tweet, _allResponses, _i, _len, _ref, _response, _results, _trigger;
              if (err) {
                _error = 'Error! [' + err.statusCode + '] ' + err.message;
                console.log(' > ' + _error);
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
        }
      });
    }
  };

}).call(this);
