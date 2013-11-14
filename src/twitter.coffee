util = require 'util'
# twitter = require 'twitter'
twitter = require 'twit'
secrets = require '../data/secrets.json'
phrases = require '../data/phrases.json'

twit = new twitter secrets
searchTerms = (Object.keys phrases.phrases).map((a) -> return '"' + a + '"').join ' OR '

module.exports =
  twitter: () ->
    _phraseNames = (Object.keys phrases.phrases)
    _phraseNamesQuoted = _phraseNames.map((a) -> return '"' + a + '"')
    _randomIndex = parseInt(Math.random() * _phraseNames.length)

    twit.get 'search/tweets', q: _phraseNames[_randomIndex], (err, data) ->
      for tweet in data.statuses

        # I *think* this is if the tweet itself has been retweeted, will investigate further.
        # if tweet.retweetedCount > 0 then continue

        # Skip retweeted.
        if tweet.retweeted_status? then continue

        _trigger = _phraseNames[_randomIndex]
        _response = phrases.phrases[_trigger][0]

        console.log tweet.id + '\n\t\t- Tweet:\t' + tweet.text + '\n\t\t- Trigger:\t' + _trigger + '\n\t\t- Response:\t' + _response

        twit.post 'statuses/update',
          # Set post parameters.
          status: '@' + tweet.user.screen_name + ' ' + _response
          in_reply_to_status_id: tweet.id.toString()
          # Callback.
          (err, data) ->
            if data.id then console.log 'Tweet sent to ' + tweet.user.name

        # Ignore others.
        break
