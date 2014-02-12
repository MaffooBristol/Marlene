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

####Pull down the repo
    git clone git@github.com:MaffooBristol/Marlene "/path/to/Marlene"

####Install dependencies from NPM
    cd /path/to/Marlene/
    npm install

####Send a single Tweet
    node marlene
    # Alternatively, you can run the executable directly.
    # You may have to run `chmod 770 marlene` to use this method.
    ./marlene

* Add the `--dry-run` or `-d` flag to view the tweet you would have sent, without actually sending it. A bit like seeing the boat you could have won at the end of Bullseye.

Compiling from sauce
----
If you're a saucy devil and want to get involved in the production of Marlene, fuck off! It's mine!

I jest, of course.

####Install Jitter globally
    sudo npm install -g jitter

####Install Coffeescript globally
    sudo npm install -g coffee-script

####In a separate terminal, start Jitter to automatically compile Coffee into JS
    jitter src/ lib/

Current version: 0.0.1 (Wogan's Run)
----
![Woooooogaaaaaaan!](http://i.telegraph.co.uk/multimedia/archive/01450/terry-hitsout_1450974c.jpg)

####Todo
* Mongo will stop the same tweet being replied to, but the same trigger/response should be stopped from occurring within succession- maybe ten tweets or so.
* Needs to be able to respond to "wtf" and "who are u?" replies, etc.
* Run with Cron or run as daemon rather than firing once and exiting.
* More advanced error handling.
* Move it into Express and create a front-end.
* Central Mongo database/database merging.
* More intelligent phrase munging.
* More phrases, phrase groups, etc. Ability to define a "bot" with its own settings.
* Different states- replying, tweeting randomly, butting in on conversations.
* Knowledge of the user to whom old Marlene is replying. Male? Female?
* Grunt, Travis, Rollbarm, testing etc.
* Create phrases that can be fired by multiple triggers. Many to many rather than one to many.
* Get a fucking life.
