Marlene
=======
The new sensation in BeaverBots.

Requirements
-----
* NodeJS
* NPM
* MongoDB
* Git
* An electronic computer
* The ability to sign up to Twitter
* An active internet connection
* Leslie Nielson's severed left index finger that's been preserved in a jar of piccalilli (optional)

Usage
-----
####Install node, NPM and Mongo
* http://www.joyent.com/blog/installing-node-and-npm/
* http://docs.mongodb.org/manual/installation/

####Set up Twitter
Sign up for an account at http://www.twitter.com. Go to dev.twitter.com and create an application, it's unimportant what you call it. Make sure you generate both access tokens and customer tokens; there should be four tokens in total.
Modify data/keys.json with the secrets generated on dev.twitter.com - requires read/write permissions.

####Send a single tweet
`node marlene`
or
`./marlene` (Note: you may have to run `chmod 770 marlene` to use this method)

* Add the `--dry-run` or `-d` flag to view the tweet you would have sent, without actually sending it. A bit like seeing the boat you could have won at the end of Bullseye. 

Compiling from sauce
----
If you're a saucy devil and want to get involved in the production of Marlene, fuck off! It's mine!
I jest, of course.

####Install Jitter globally
`sudo npm install -g jitter`

####Install Coffeescript globally
`sudo npm install -g coffeescript`

####Pull down the repo
`git clone git@github.com:MaffooBristol/Marlene "/path/to/Marlene"`

####Install dependencies from NPM
`cd /path/to/Marlene/`
`npm install`

####In a separate terminal, start Jitter to automatically compile Coffee into JS
`jitter src/ lib/`

Roadmap (0.0.1)
----
A lot more things will be added in the future, mainly DB stuff so the same tweet is not replied to more than once, the triggers and responses are a bit more seemingly random. That kinda thing.
