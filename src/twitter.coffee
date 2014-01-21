util    = require 'util'
os      = require 'os'
fs      = require 'fs'
twitter = require 'twit'
argv    = require('optimist').argv
yaml    = require('js-yaml')

secrets = require '../data/secrets.json'
phrases = yaml.safeLoad fs.readFileSync(require('path').resolve(__dirname, '../data/phrases.yaml'), 'utf8')

db      = require('mongojs').connect('marlene', ['tweets'])

skip = false

dbRecord =
  started: Math.round(new Date().getTime() / 100)
  hostname: os.hostname()
  sent: false

twit = new twitter secrets
searchTerms = (Object.keys phrases.phrases).map((a) -> return '"' + a + '"').join ' OR '

module.exports =
  twitter: () ->
    _phraseNames = (Object.keys phrases.phrases)
    _phraseNamesQuoted = _phraseNames.map((a) -> return '"' + a + '"')
    _randomIndex = parseInt(Math.random() * _phraseNames.length)

    twit.get 'search/tweets', q: _phraseNamesQuoted[_randomIndex], (err, data) ->
      for tweet in data.statuses

        # I *think* this is if the tweet itself has been retweeted, will investigate further.
        # if tweet.retweetedCount > 0 then continue

        # Skip retweeted.
        if tweet.retweeted_status? then continue

        # Sometimes RTs get through because of strange things involving quotes
        # and stuff, so best just to ignore them.
        if tweet.text.indexOf('RT') > -1 then continue

        _trigger = _phraseNames[_randomIndex]
        _response = phrases.phrases[_trigger][0]

        console.log tweet.id + '\n\t\t- Tweet:\t' + tweet.text + '\n\t\t- Trigger:\t' + _trigger + '\n\t\t- Response:\t' + _response

        db.tweets.find {in_reply_to_status_id: tweet.id_str, sent: true}, (err, data) ->
         if (data.length > 0)
           console.log '\nAlready seen tweet, skipping.'
           db.close()
           return

          if argv['dry-run']? or argv.d
            console.log '\nYou\'ve set the dry-run flag; tweet NOT sent.'
          else
            twit.post 'statuses/update',
              # Set post parameters.
              status: '@' + tweet.user.screen_name + ' ' + _response
              in_reply_to_status_id: tweet.id_str
              # Callback.
              (err, data) ->
                if data.id
                  dbRecord.sent = true
  #                dbRecord.tweet_id =
                  console.log 'Tweet sent to ' + tweet.user.name + '\n'
                  console.log 'Replied to ' + tweet.in_reply_to_status_id_str + '\n'

          dbRecord.in_reply_to_status_id = tweet.id_str
          dbRecord.complete = Math.round(new Date().getTime() / 100)
          db.tweets.save dbRecord, (err) ->
            console.log err
          db.close()

        # Ignore others.
        break

