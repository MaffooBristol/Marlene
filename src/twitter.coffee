util    = require 'util'
os      = require 'os'
fs      = require 'fs'
twitter = require 'twit'
argv    = require('optimist').argv
yaml    = require 'js-yaml'
rollbar = require 'rollbar'
crypto  = require 'crypto'
moment  = require 'moment'
clc     = require 'cli-color'
restler = require 'restler'
db      = require('mongojs').connect('marlene', ['tweets'])

secrets = if (argv.secrets?) then require '../data/' + argv.secrets else require '../data/secrets.json'

_phrases = if (argv.phrases?) then '../data/' + argv.phrases else '../data/phrases.yaml'

phrases = yaml.safeLoad fs.readFileSync(require('path').resolve(__dirname, _phrases), 'utf8')

skip = false

dbRecord =
  started: Math.round(new Date().getTime() / 100)
  hostname: os.hostname()
  sent: false

error     = clc.red.bold
warn      = clc.yellow
notice    = clc.blue
emphasise = clc.bold

module.exports =

  parseResponse: (text) ->
    text = text.replace '[name]', @myName
    return text

  finalise: (_exitCode) ->
    _exitCode = _exitCode or 0
    console.log ' > Shutting down...'
    db.close()
    rollbar.shutdown()
    if _exitCode == 0
      console.log ' > Done! Everything seemed to go okay :)\n'
    else
      console.log " > Done... but something went horribly wrong, it seems :(\n"
    process.exit(_exitCode)
    return

  saveDBRecord: (tweet, _trigger, _response) ->
    dbRecord.in_reply_to_status_id = tweet.id_str
    dbRecord.tweet_text = crypto.createHash('md5').update(tweet.text).digest('hex')
    dbRecord.response = crypto.createHash('md5').update(_response).digest('hex')
    dbRecord.trigger = crypto.createHash('md5').update(_trigger).digest('hex')
    dbRecord.complete = Math.round(new Date().getTime() / 100)
    db.tweets.save dbRecord, (err) ->
      console.log err
    console.log ' > Saved DB Record.'

  sendTweet: (tweet, _trigger, _response, _noFinalise) ->

    _self = @
    _noFinalise = _noFinalise or false

    _response = @parseResponse _response

    db.tweets.find {in_reply_to_status_id: tweet.id_str, sent: true}, (err, data) ->
      console.log '\n > - Unique ID:\t' + tweet.id + '\n > - Trigger:\t' + _trigger + '\n > - Tweet:\t' + tweet.text.replace('\n', '') + '\n > - Response:\t' + emphasise(_response) + '\n'
      if data? and data.length > 0
        console.log ' > Already seen tweet, skipping.'
        rollbar.reportMessage 'Already seen tweet, skipping: ' + tweet.user.name + ': ' + tweet.text
        _self.finalise() unless _noFinalise
        return

      if argv['dry-run']? or argv.d
        console.log '\n > You\'ve set the dry-run flag; tweet NOT sent.'
        rollbar.reportMessage 'Dry run: ' + tweet.text + ' / ' + _response
        _self.saveDBRecord(tweet, _trigger, _response)
        _self.finalise() unless _noFinalise
      else
        _self.twit.post 'statuses/update',
          # Set post parameters.
          status: '@' + tweet.user.screen_name + ' ' + _response
          in_reply_to_status_id: tweet.id_str
          # Callback.
          (err, data) ->
            if data.id
              dbRecord.sent = true
              console.log ' > Tweet sent to ' + tweet.user.name + ' (@' + tweet.user.screen_name + ') / ' + (tweet.in_reply_to_status_id or tweet.in_reply_to_status_id_str)
              rollbar.reportMessage 'Tweet sent to ' + tweet.user.name + ': ' + tweet.text + ' / ' + _response
              _self.saveDBRecord(tweet, _trigger, _response)
              _self.finalise() unless _noFinalise

  twitter: () ->

    _self = @

    _self.twit = new twitter secrets

    _self.timeoutCounter = setTimeout () ->
      console.log " > (5s) It's all taking rather a long time..."
      clearTimeout _self.timeoutCounter
      _self.timeoutCounter = setTimeout () ->
        console.log error(" > (15s) Fuck this shit, aborting...")
        clearTimeout _self.timeoutCounter
        _self.finalise(1)
      , 10000
    , 5000

    if secrets.rollbar?
      rollbar.init secrets.rollbar,
        level: 'debug' # This doesn't work, need to investigate.
      rollbar.errorHandler secrets.rollbar
      rollbar.handleUncaughtExceptions();
    else
      rollbar.reportMessage = () -> return

    rollbar.reportMessage 'Initialising Marlene...'

    _phraseNames = (Object.keys phrases.phrases)
    _phraseNamesQuoted = _phraseNames.map((a) -> return '"' + a + '"')
    _randomIndex = parseInt(Math.random() * _phraseNames.length)

    _self.twit.get 'account/verify_credentials', (err, data) ->
      if err
        _error = 'Error! [' + err.statusCode + '] ' + err.message
        console.log ' > ' + _error
        throw new Error _error
        return
      console.log ' > Running Marlene as ' + data.name + '.'
      _self.myName = data.name
      _self.myScreenName = data.screen_name


      if !argv.method? then argv.method = 'intrude'

      switch argv.method
       when 'reply'
          _self.twit.get 'statuses/mentions_timeline', count: 100, (err, data) ->
            if err
              _error = 'Error! [' + err.statusCode + '] ' + err.message
              console.log ' > ' + _error
              throw new Error _error
              return
            for mention in data
              for reply in phrases.replies
                for trigger in reply.triggers
                  if mention.text.toLowerCase().indexOf(trigger.toLowerCase()) > -1
                    _response = reply.responses[Math.floor(Math.random() * reply.responses.length)]
                    _now = moment()
                    _then = moment(mention.created_at)
                    if _now.diff(_then, 'days') < 7 then _self.sendTweet mention, trigger, _response

        when 'observe'
          _self.userStream = _self.twit.stream 'statuses/filter', {track: '@' + _self.myScreenName, replies: 'all'}

          console.log ' > Observing direct mentions...'

          clearTimeout(_self.timeoutCounter)
          # Uncomment to force aborting after 30 seconds.
          # _self.timeoutCounter = setTimeout () ->
          #   console.log " > (30s) Fuck this shit, aborting..."
          #   clearTimeout _self.timeoutCounter
          #   _self.finalise(1)
          # , 25000
          _self.userStream.on 'tweet', (tweet) ->
            if _self.timeoutCounter._idleTimeout > -1
              clearTimeout(_self.timeoutCounter)
            _text = tweet.text.replace("\n", '')
            _output = ' > '
            _output += tweet.user.name
            for i in [0..14-tweet.user.screen_name.length]
              _output += ' '
            console.log _output + _text

            for j in phrases.replies
              for k in j.triggers
                unless _text.toLowerCase().indexOf(k.toLowerCase()) > -1
                  continue
                console.log '\n > Matched on ' + emphasise(k)
                rollbar.reportMessage 'Matched on ' + k
                _response = j.responses[Math.floor(Math.random() * j.responses.length)]
                if secrets.restler_url?
                  console.log ' > Sending webhook to Zapier via Restler'
                  restler.post secrets.restler_url, data:
                    tweet: tweet
                    trigger: k
                    response: _response

                console.log ' > Parrying mention/direct reply...'
                _self.sendTweet tweet, k, _response, true

                return

        when 'intrude'
          console.log ' > Intruding...'
          _self.twit.get 'search/tweets', q: _phraseNamesQuoted[_randomIndex], (err, data) ->
            if err
              _error = 'Error! [' + err.statusCode + '] ' + err.message
              console.log ' > ' + _error
              throw new Error _error
              return
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

              _self.sendTweet(tweet, _trigger, _response)

              # Ignore others.
              break

