<?php
	include 'lib/EpiCurl.php';
	include 'lib/EpiOAuth.php';
	include 'lib/EpiTwitter.php';

	$consumer_key = 'GX2t6BQgm3hGpDnnLCFyQ';
	$consumer_secret = 'tY2oCiVK0VQSUpmdfOsS4tQMfSqwsToftbQh4DlxI8';

	$error = false;
	$resultsCount = 3;
	$terms = '';
	$userSearch = false;
	$username = false;
	$unquotedTerms = '';
	$lowercaseUnquotedTerms = '';

	$twitterObj = new EpiTwitter($consumer_key, $consumer_secret);
	$oauth_token = $_GET['oauth_token'];

	$phraseTable = array(
		"i was named after" => array("I was named after 'Marlene Beaver'", "I was named after Jane Seymour's character in the 90's TV show 'Dr. Quinn, Medicine Woman'"),
		"my favourite film" => array("That's always been a firm favourite of mine as well. That and Extreme Interratial Fisting Volume 5 (collector's edition).", "That is a classic film. The 3 week long extended director's cut is rather special."),
		"what's the similarity between" => array("They were both illegal until 1964", "They have both been shown to elicit a panic response in laboratory horses."),
		"school was sooo" =>  array("You should send probably threatening letters to your teachers if that's how you feel.", "You should challenge your least favourite teacher to a duel.", "I left school before I was even born."),
		"sooo bored" => array("I think you should get a job.", "Whenever I'm at a loose end, I read a book, play the piano or engage in unconventional sexual practices.", "Boredom is one of the leading causes of crime amongst today's youth."),
		"i still can't believe" => array("I find it hard to believe as well", "It came as a shock to all of us."),
		"she was a" => array("As far as I know, she still is."),
		"i'm not racist but" => array("That doesn't sound racist at all."),
		"i remember the first" => array("Wow, I can't remember that far back.", "Me too- I remember it well."),
		"i can't sleep" => array("I always find that counting seahorses helps me drop off.", "Whenever I have difficulty sleeping, I say a little prayer. And sometimes I touch myself."),
		"my proudest achievement" => array("One of my proudest achievements was winning a level 2 Food Safety award."),
		"can anyone explain" => array("There are some things we can never explain.", "To answer your question: 'no'.", "Why are you so eager for an explanation? There's nothing wrong with a bit of mystery.", "Some things are best left unexplained.")
	);

	$replyPhraseTable = array(
		array(
			"triggers" => array("shut up", "stfu", "shut the fuck up"),
			"responses" => array("What? I didn't say anything.", "That's no way to talk to a woman of my stature")
		),
		array(
			"triggers" => array("lol", "lmao", "landrover", "pmsl"),
			"responses" => array("'laughing aloud to myself'", "I'm glad you think it's funny")
		),
	);

	if($oauth_token == '') {
		$url = $twitterObj->getAuthorizationUrl();
		echo "<a href='$url' class='login'>Sign In with Twitter</a>";
	} else {
		$twitterObj->setToken($_GET['oauth_token']);
		$token = $twitterObj->getAccessToken();
		$twitterObj->setToken($token->oauth_token, $token->oauth_token_secret);
		$_SESSION['ot'] = $token->oauth_token;
		$_SESSION['ots'] = $token->oauth_token_secret;
		$twitterInfo= $twitterObj->get_accountVerify_credentials();
		$twitterInfo->response;

		$username = $twitterInfo->screen_name;
		$profilepic = $twitterInfo->profile_image_url;
	}

	//If the form is submitted
	if(isset($_POST['search'])) {

		$terms = trim($_POST['terms']);
		if(isset($_POST['searchSpecificUser'])) {
			//$userSearch = $_POST['searchSpecificUser'];
			//$username = $_POST['username'];
			$username = "TunicBumflek";
		}

		if($terms == '') {
			$error = true;
		} else {
			$unquotedTerms = str_replace('"', '', $terms);
			$lowercaseUnquotedTerms = strtolower($unquotedTerms);
		}
	}

	$phrasesFile = file_get_contents('phrasebook.xml');
	$phrasesXml = simplexml_load_string($phrasesFile);

   //echo $phrasesXml->entry[0]->trigger[0];

foreach($phrasesXml->entry->trigger as $item) {
	/*
	$items[$i]['title'] = $item->$item_title;
	$items[$i]['link'] = $item->$item_link;
	$items[$i]['desc'] = $item->$item_desc;
	$items[$i]['date'] = $item->$item_date;
	*/
}

	foreach($phrasesXml->entry as $entry) {
		foreach($entry->trigger as $trigger) {
			//echo $trigger . "<br>";
		}
	}
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title></title>
	<link rel="stylesheet" href="css/styles.css" />

	<script src="js/jquery-1.7.1.min.js"></script>
	<script>
		jQuery.fn.highlight = function (str, className) {
			var regex = new RegExp(str, "gi");

			return this.each(function () {
				this.innerHTML = this.innerHTML.replace(regex, function(matched) {return "<span class=\"" + className + "\">" + matched + "</span>";});
			});
		};

		$(document).ready(function() {
			var terms = $("#current-terms").text();
			$("li").highlight(terms, "highlighted");

			$("#specificUserToggle").click(function() {
				if($(this).is(':checked')) {
					$("#user-controls").animate({'width': '220px', 'opacity': 1}, 250);
				} else {
					 $("#user-controls").animate({'width': '0px', 'opacity': 0}, 250);
				}

			})

		})

	</script>

</head>
<body>

<form action="<?php echo $_SERVER['PHP_SELF'] ?>" method="post">
	<fieldset>
		<legend>Input</legend>
		<label for="terms">Search terms:</label>
		<!-- <input type="text" name="terms" id="terms" value="<?php echo $unquotedTerms ?>"/>-->
<?php
	echo '<select name="terms" id="terms">';
	foreach($phraseTable as $key => $value) {
		echo '<option>"' . $key . '"</option>';
	}

	echo '</select>';
?>
		<label for="specificUserToggle">Search Specific User:</label>
		<input type="checkbox" name="searchSpecificUser" id="specificUserToggle" />
		<span id="user-controls">
			<label for="username">Username:</label>
			<input type="text" name="username" id="username" />
		</span>
		<input type="submit" name="search" value="Search" />
		<?php
			if($error) echo '<div class="error">Please enter valid search term(s)</div>';
		?>
	</fieldset>
</form>

<?php

	if(isset($_POST['search']) && !$error) {
		if($username) {
			$query = 'http://api.twitter.com/1/statuses/user_timeline.json?screen_name=' . $username . '&count=' . $resultsCount;
			echo '<h2>Showing results for user:<span id="current-terms" class="highlighted">' . $username . '</span></h2>';
			$results = json_decode(file_get_contents($query), true);
		} else {
			$query = 'http://search.twitter.com/search.json?rpp=' . $resultsCount . '&q=' . urlencode($terms);
			echo '<h2>Showing results for terms: &ldquo;<span id="current-terms" class="highlighted">' . $unquotedTerms . '</span>&rdquo;</h2>';
			$results = json_decode(file_get_contents($query), true);
			$results = $results['results'];
		}

		echo '<ul>';

		foreach($results as $tweet) {

			// Don't respond to re-tweets
		   if(strpos($tweet['text'], "RT") === false) {
				echo '<li><span class="username">' . $tweet['from_user'] . '</span>: ' . $tweet['text']; //Can use $tweet['to_user_name '] to test if the tweet was directed at anyone;
				echo '<div class="response">';
				$response = generateResponse($lowercaseUnquotedTerms);				
				//$response = generateReply($tweet['text']);
				if($response) {
					//$msg = '@' . $username . ' ' . $response;
					$msg = '@' .  $tweet['from_user'] . ' ' . $response;
					print_r($msg);
					$replyToID = (int)$tweet['id_str'];

					//$twitterObj->setToken($_SESSION['ot'], $_SESSION['ots']);
					//$update_status = $twitterObj->post_statusesUpdate(array('status' => $msg, 'in_reply_to_status_id' => $replyToID));
					//$temp = $update_status->response;
				}

				echo '</div></li>';
			} else {
				echo '<li class="ignored">(Re-tweet; ignored)</li>';
			}
		}
	}

	function generateResponse($inputPhrase) {
		global $phraseTable;
		$response = false;

		$responseIndex = rand(0, count($phraseTable[$inputPhrase]) -1); // pick one of the designated responses at random
		$response = $phraseTable[$inputPhrase][$responseIndex];

		return $response;
	}

	function generateReply($inputText) {
		global $replyPhraseTable;

		$inputText = strtolower($inputText);
		$response = false;

		// Need to limit it to one response, i.e. stop function when a match is found.
		foreach ($replyPhraseTable as $phrase) {
			foreach($phrase["triggers"] as $word) {
				if (strrpos($inputText, $word) === false) {
					//not found
				} else {
					//found
					$responseIndex = rand(0, count($phrase["responses"]) -1); // pick one of the designated responses at random
					$response = $phrase["responses"][$responseIndex];
					return $response;
				}
			}
		}

		foreach($replyPhraseTable as $key => $value) {
			//echo $key . '<br/>';

			//$pos = strpos($haystack, $needle);
			$pos = true;
			if($pos === false) {
			 // string needle NOT found in haystack
			}
			else {
			 // string needle found in haystack
			}
		}
	}

/*

"he is a" - he may be many things, but that is not one of them
"she was a" - and in many ways, she still is.
"I am a robot"
"I don't think I'll ever" - hey, maybe one day you will if you put your mind to it.
"I can't believe" - you'd better believe it, punk / I can't believe it either.
"I hate bots" - Hey, some of us are OK.
"was the first" - ...let's hope it's not the last.
"can anyone explain" - there are some things we can never explain
"why do all" / "I don't know why" -
"that's rhetorical"
"I've got so many" - I've got more / It is vulgar to make such boasts
"I'm not racist but" - You're right, that's not racist at all.
"I'm not homophobic but" - The gays are just adorable aren't they?
*/

// Every n minutes:
	// Pick one of the phrase keys from the table at random
	// Search for that phrase
	// Reply to one of the returned tweets

	// Find any new tweets directed at @MarleneBeaver, and iterate through them. For each $tweet
		// Iterate through the response phrase table. For each $item
			// See if the key is contained in the tweet. If it is:
			// Pick a response and send it
?>
</ul>

<fieldset style="display: none">
	<legend>Output</legend>
	<label for="reply">Reply:</label>
	<textarea rows="3" cols="40" name="reply" id="reply"></textarea>
	<input type="submit" name="reply" value="Tweet it!" />
</fieldset>
</body>
</html>