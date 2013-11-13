util = require 'util'
twitter = require 'twitter'
secrets = require '../data/keys.json'
phrases = require '../data/phrases.json'

twit = new twitter secrets
searchTerms = (Object.keys phrases.phrases).map((a) -> return '"' + a + '"').join ' OR '

module.exports =
  twitter: () ->
    _phraseNames = (Object.keys phrases.phrases)
    _phraseNamesQuoted = _phraseNames.map((a) -> return '"' + a + '"')
    _randomIndex = parseInt(Math.random() * _phraseNames.length)

    twit.search _phraseNames[_randomIndex], include_entities: true, (data) ->
      for tweet in data.statuses

        # I *think* this is if the tweet itself has been retweeted, will investigate further.
        # if tweet.retweetedCount > 0 then continue

        # Skip retweeted.
        if tweet.retweeted_status? then continue

        _trigger = _phraseNames[_randomIndex]
        _response = phrases.phrases[_trigger][0]

        console.log tweet.id + '\n\t\t- Tweet:\t' + tweet.text + '\n\t\t- Trigger:\t' + _trigger + '\n\t\t- Response:\t' + _response

        # Ignore others.
        break
