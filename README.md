# Alexa Skill Test Framework

This framework makes it easy to create full-coverage black box tests for an Alexa skill using [Mocha](https://mochajs.org/).

Here's an example of what a test might look like with the test framework.
``` Javascript
describe("AMAZON.HelpIntent into AMAZON.CancelIntent", function(){
  alexaTest.test([
    { request: alexaTest.getIntentRequest("AMAZON.HelpIntent"), says: alexaTest.t("HELP_MESSAGE"), shouldEndSession: false },
    { request: alexaTest.getIntentRequest("AMAZON.CancelIntent"), says: alexaTest.t("STOP_MESSAGE"), shouldEndSession: true }
  ]);
});
```

## Other Versions

**There is a new version of this framework, that is optimized for version 2 of the ask-sdk and is written in Typescript. You can find it on https://github.com/taimos/ask-sdk-test**  
**This version will continue to exist, but new features might be in the other library first**

There is a **Python** adaptation of the framework available at https://github.com/BananaNosh/py_ask_sdk_test.

## How To
Install the package as a dev dependency with `npm install alexa-skill-test-framework --save-dev`.

Write tests in a Javascript file and run them with Mocha. For example, if your test is at 'test/index.js', run `mocha test/index.js`.

For some simple examples, see the 'examples' directory.

## Test Framework Documentation

### alexaTest.initialize(index, appId, userId, deviceId)
Initializes the test framework. Must be called before generating requests or running any tests.
* `index`: The object containing your skill's 'handler' method. Must define a method called `handler(event, context, callback)`, which runs the skill.
  * The test framework passes 'true' as a fourth parameter to the handler. Obviously this should be used sparingly, if at all.
* `appId`: The Skill's app ID. Looks like "amzn1.ask.skill.00000000-0000-0000-0000-000000000000".
* `userId`: The Amazon User ID to test with. Looks like "amzn1.ask.account.LONG_STRING".
* `deviceId`: Optional The Amazon Device ID to test with. Looks like "amzn1.ask.device.LONG_STRING"

### alexaTest.initializeI18N(resources)
Initializes i18n. You only need this if you use i18n in your skill, and you want to use i18n to fetch result strings to test against. You must have installed the optional dependencies `i18n` and `i18next-sprintf-postprocessor`.
* `resources`: The same resource object you pass to i18n inside your skill.

### alexaTest.setLocale(locale)
Changes the locale used by the test framework and the skill. Default is 'en-US'.
* `locale`: A string representing the locale to use.

### alexaTest.setDynamoDBTable(tableName)
Activates mocking of DynamoDB backed attributes.
* `tableName`: The name of the DynamoDB Table to use
* `partitionKeyName`: the key to be used as id (default: userId)
* `attributesName`: the key to be used for the attributes (default: mapAttr)

### alexaTest.unmockDynamoDB()
Removes the mock on the AWS SDK.

### alexaTest.setExtraFeature(key, state)
Enables or disabled an optional test feature.
* `key`: The key of the feature to change.
* `state`: Whether the feature should be enabled or disabled.

Current features are:
* `questionMarkCheck`: Checks that responses that end the session do not contain question marks, and responses that keep the session open do.

### alexaTest.getLaunchRequest([locale])
Returns a [LaunchRequest][launchrequest docs]. The request can be passed to `test` (see below).
* `locale`: Optionally, an override locale for the request.

### alexaTest.getIntentRequest(intentName, [slots], [locale])
Returns an [IntentRequest][intentrequest docs]. The request can be passed to `test` (see below).
* `intentName`: The name of the intent to invoke.
* `slots`: Optionally, an object containing key-value pairs. The keys are the names of the slots required by the specified intent, and the values are the slot values.
* `locale`: Optionally, an override locale for the request.

### alexaTest.getSessionEndedRequest(reason, [locale])
Returns a [SessionEndedRequest][sessionendedrequest docs]. The request can be passed to `test` (see below).
* `reason`: The reason. See the [SessionEndedRequest][sessionendedrequest docs] documentation.
* `locale`: Optionally, an override locale for the request.

### addAudioPlayerContextToRequest(request, [token], [offset], [activity])
Adds an AudioPlayer context to the given request. Returns the given request to allow call chaining.
* `request`: The intent request to modify.
* `token` An opaque token that represents the audio stream described by this AudioPlayer object. You provide this token when sending the Play directive.
* `offset` Identifies a track’s offset in milliseconds at the time the request was sent. This is 0 if the track is at the beginning.
* `activity` Indicates the last known state of audio playback.

### alexaTest.addEntityResolutionToRequest(request, slotName, slotType, value, [id])
Adds an entity resolution to the given request. Returns the given request to allow call chaining.
* `request`: The intent request to modify.
* `slotName`: The name of the slot to add the resolution to. If the slot does not exist it is added.
* `slotType`: The type of the slot.
* `value`: The value of the slot.
* `id`: Optionally, the id of the resolved entity.

###	alexaTest.addEntityResolutionsToRequest(request, resolutions)
Adds multiple entity resolutions to the given request. Returns the given request to allow call chaining.
* `request`: The intent request to modify.
* `resolutions`: The array containing the resolutions to add

### alexaTest.addEntityResolutionNoMatchToRequest(request, slotName, slotType, value)
Adds an entity resolution with code ER_SUCCESS_NO_MATCH to the given request. Returns the given request to allow call chaining.
* `request`: The intent request to modify.
* `slotName`: The name of the slot to add the resolution to. If the slot does not exist it is added.
* `slotType`: The type of the slot.
* `value`: The value of the slot.

### alexaTest.test(sequence, [description])
Tests the skill with a sequence of requests and expected responses. This method should be called from inside a Mocha `describe` block.
* `sequence`: An array of requests to test. Each element can have these properties:
  * `request`: The request to run. Generate these with one of the above `getFooRequest` methods.
  * `says`: Optional String or Array of Strings. Tests that the speech output from the request is the string specified.
  * `saysLike`: Optional String. Tests that the speech output from the request contains the string specified.
  * `saysNothing`: Optional Boolean. If true, tests that the response has no speech output.
  * `reprompts`: Optional String or Array of Strings. Tests that the reprompt output from the request is the string specified.
  * `repromptsLike`: Optional String. Tests that the reprompt output from the request contains the string specified.
  * `repromptsNothing`: Optional Boolean. If true, tests that the response has no reprompt output.
  * `shouldEndSession`: Optional Boolean. If true, tests that the response to the request ends or does not end the session.
  * `saysCallback(context, speech)`: Optional Function. Receives the speech from the response as a parameter. You can throw nice assertions using `context.assert` and get text from i18n with `context.t`.
  * `callback(context, response)`: Optional Function. Receives the [response][response examples] object from the request as a parameter. You can throw nice assertions using `context.assert` and get text from i18n with `context.t`.
  * `elicitsSlot`: Optional String. Tests that the response asks Alexa to elicit the given slot.
  * `confirmsSlot`: Optional String. Tests that the response asks Alexa to confirm the given slot.
  * `confirmsIntent`: Optional Boolean. Tests that the response asks Alexa to confirm the intent.
  * `hasAttributes`: Optional Object. Tests that the response contains the given attributes and values. Values can be strings or functions testing the value.
  * `hasCardTitle`: Optional String. Tests that the card sent by the response has the title specified.
	* `hasCardContent`: Optional String. Tests that the card sent by the response is a simple card and has the content specified.
	* `hasCardContentLike`: Optional String. Tests that the card sent by the response is a simple card and contains the content specified.
	* `hasCardText`: Optional String. Tests that the card sent by the response is a standard card and has the text specified.
	* `hasCardTextLike`: Optional String. Tests that the card sent by the response is a standard card and contains the text specified.
	* `hasSmallImageUrlLike`: Optional String. Tests that the card sent by the response is a standard card and has a small image URL containing the string specified.
	* `hasLargeImageUrlLike`: Optional String. Tests that the card sent by the response is a standard card and has a large image URL containing the string specified.
  * `withStoredAttributes`: Optional Object. The attributes to initialize the handler with. Used with DynamoDB mock
  * `storesAttributes`: Optional Object. Tests that the given attributes were stored in the DynamoDB. Values can be strings or functions testing the value.
  * `withSessionAttributes`: Optional Object. The session attributes to initialize the an intent request with. Values can be strings, booleans, or integers.
  * `playsStream`: Optional Object. Tests that the AudioPlayer is used to play a stream.
  * `stopsStream`: Optional Boolean. Tests that the AudioPlayer is stopped.
  * `clearsQueue`: Optional String. Tests that the AudioPlayer clears the queue with the given clear behavior.
* `description`: An optional description for the mocha test

The `playsStream` Object has the following properties:
* `behavior`: String. The expected playBehavior of the AudioPlayer.
* `url`: String. The expected URL of the stream.
* `token`: Optional String. The expected token for the stream.
* `previousToken`: Optional String. The expected previousToken for the stream.
* `offset`: Optional Integer. The expected offset of the stream.

### alexaTest.t(arguments)
Forwards the request to `alexaTest.i18n.t` and returns the result. You must have called `alexaTest.initializeI18N` previously.

## CallbackContext Documentation
Callback context objects are passed to `callback` and `saysCallback` in tests.

### context.assert(data)
Throws an assertion error.
* `data` Object holding data for the error. Can include:
  * `message`: Optionally, a string describing the failure.
  * `expected`: Optionally, the expected value.
  * `actual`: Optionally, the actual value.
  * `operator`: Optionally, the comparison operator that was used.
  * `showDiff`: Optionally, true if Mocha should diff the expected and actual values.

### context.t(arguments)
Forwards the request to `alexaTest.i18n.t` and returns the result. Additionally, ensures the language is the language used in the request. You must have called `alexaTest.initializeI18N` previously.

## Note About DynamoDB
If your skill uses the [Alexa Skills Kit for Node.js][nodekit] and uses its built-in DynamoDB persistence, it may be desireable not to connect to the database during testing, since the ASK Node kit uses it to persist session attributes. For that case, the framework passes a fourth parameter of `true` to the `handler` function, which you can conditionalize on to disable the database connection.

[sessionendedrequest docs]: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-standard-request-types-reference#sessionendedrequest
[launchrequest docs]: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-standard-request-types-reference#launchrequest
[intentrequest docs]: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-standard-request-types-reference#intentrequest
[response examples]: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/alexa-skills-kit-interface-reference#response-examples
[nodekit]: https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs
