util = require 'util'
twitter = require 'twitter'
secrets = require '../data/keys.json'
phrases = require '../data/phrases.json'

twit = new twitter secrets
searchTerms = (Object.keys phrases.phrases).map((a) -> return '"' + a + '"').join ' OR '

module.exports =
  twitter: () ->
    twit.search searchTerms, include_entities: true, (data) ->
      console.log(util.inspect(data))
