cron = require 'cron'
twit = require './twitter'

console.log ''

require('dns').resolve 'twitter.com', (err) ->
  if err
    console.log "Error! Can't connect to twitter."
    process.exit(1)

twit.twitter()
