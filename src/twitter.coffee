util    = require 'util'
os      = require 'os'
fs      = require 'fs'
twitter = require 'twit'
argv    = require('optimist').argv
yaml    = require 'js-yaml'
rollbar = require 'rollbar'
crypto  = require 'crypto'
db      = require('mongojs').connect('marlene', ['tweets'])

secrets = if (argv.secrets?) then require '../data/' + argv.secrets else require '../data/secrets.json'

_phrases = if (argv.phrases?) then '../data/' + argv.phrases else '../data/phrases.yaml'

phrases = yaml.safeLoad fs.readFileSync(require('path').resolve(__dirname, _phrases), 'utf8')

skip = false

dbRecord =
  started: Math.round(new Date().getTime() / 100)
  hostname: os.hostname()
  sent: false

twit = new twitter secrets
searchTerms = (Object.keys phrases.phrases).map((a) -> return '"' + a + '"').join ' OR '

module.exports =
  twitter: () ->

    rollbar.init secrets.rollbar
    rollbar.reportMessage 'Initialising Marlene...'

    _phraseNames = (Object.keys phrases.phrases)
    _phraseNamesQuoted = _phraseNames.map((a) -> return '"' + a + '"')
    _randomIndex = parseInt(Math.random() * _phraseNames.length)

    # twit.get 'statuses/mentions_timeline', q: '@teslacool1', (err, data) ->
      # console.log data

    twit.get 'search/tweets', q: _phraseNamesQuoted[_randomIndex], (err, data) ->
      unless data? and data.statuses? then return false
      for tweet in data.statuses

        # I *think* this is if the tweet itself has been retweeted, will investigate further.
        # if tweet.retweetedCount > 0 then continue

        # Skip retweeted.
        if tweet.retweeted_status? then continue

        # Sometimes RTs get through because of strange things involving quotes
        # and stuff, so best just to ignore them.
        if tweet.text.indexOf('RT') > -1 then continue

        _trigger = _phraseNames[_randomIndex]
        _allResponses = phrases.phrases[_trigger]
        _response = _allResponses[Math.floor(Math.random() * _allResponses.length)]

        console.log tweet.id + '\n\t\t- Tweet:\t' + tweet.text + '\n\t\t- Trigger:\t' + _trigger + '\n\t\t- Response:\t' + _response

        db.tweets.find {in_reply_to_status_id: tweet.id_str, sent: true}, (err, data) ->
         if (data.length > 0)
           console.log '\nAlready seen tweet, skipping.'
           rollbar.reportMessage 'Already seen tweet, skipping: ' + tweet.user.name + ': ' + tweet.text
           db.close()
           rollbar.shutdown()
           return

          if argv['dry-run']? or argv.d
            console.log '\nYou\'ve set the dry-run flag; tweet NOT sent.'
            rollbar.reportMessage 'Dry run: ' + tweet.text + ' / ' + _response
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
                  rollbar.reportMessage 'Tweet sent to ' + tweet.user.name + ': ' + tweet.text + ' / ' + _response

          dbRecord.in_reply_to_status_id = tweet.id_str

          dbRecord.in_reply_to_status_id = tweet.id_str
          dbRecord.tweet_text = crypto.createHash('md5').update(tweet.text).digest('hex')
          dbRecord.response = crypto.createHash('md5').update(_response).digest('hex')
          dbRecord.trigger = crypto.createHash('md5').update(_trigger).digest('hex')
          dbRecord.complete = Math.round(new Date().getTime() / 100)
          db.tweets.save dbRecord, (err) ->
            console.log err
          db.close()
          rollbar.shutdown()

        # Ignore others.
        break

