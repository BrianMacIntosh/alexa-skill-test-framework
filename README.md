This framework makes it easy to create full-coverage black box tests for an Alexa skill using [Mocha](https://mochajs.org/).

# How To
Install the package as a dev dependency with `npm install alexa-skill-test-framework --save-dev`. //TODO: add to npm

Write tests in a Javascript file and run them with Mocha. For example, if your test is at 'test/index.js', run `mocha test/index.js`.

For some simple examples, see the 'examples' directory.

# Documentation

## alexaTest.initialize(index, version, appId, userId)
Initializes the test framework. Must be called before generating requests or running any tests.
* `index`: The object containing your skill's 'handler' method. Must define a method called `handler(event, context, callback)`, which runs the skill.
  * The test framework passes 'true' as a fourth parameter to the handler. Obviously this should be used sparingly, if at all.
* `version`: A string representing the version of the skill to use. //TODO: test
* `appId`: The Skill's app ID. Looks like "amzn1.ask.skill.00000000-0000-0000-0000-000000000000".
* `userId`: The Amazon User ID to test with. Looks like "amzn1.ask.account.LONG_STRING".

## alexaTest.initializeI18N(resources)
Initializes i18n. You only need this if you use i18n in your skill, and you want to use i18n to fetch result strings to test against. You must have installed the optional dependencies `i18n` and `i18next-sprintf-postprocessor`.
* `resources`: The same resource object you pass to i18n inside your skill.

## alexaTest.setLocale(locale)
Changes the locale used by the test framework and the skill. Default is 'en-US'.
* `locale`: A string representing the locale to use.

## alexaTest.getLaunchRequest()
Returns a LaunchRequest. The request can be passed to `test` (see below).

## alexaTest.getIntentRequest(intentName, slots)
Returns an IntentRequest. The request can be passed to `test` (see below).
* `intentName`: The name of the intent to invoke.
* `slots`: Optionally, an object containing key-value pairs. The keys are the names of the slots required by the specified intent, and the values are the slot values.

## alexaTest.getSessionEndedRequest(reason)
Returns a SessionEndedRequest. The request can be passed to `test` (see below).
* `reason`: The reason. See the SessionEndedRequest [documentation][sessionendedrequest docs].

## alexaTest.test(sequence)
Tests the skill with a sequence of requests and expected responses. This method should be called from inside a Mocha `describe` block.
* `sequence`: An array of requests to test. Each element can have these properties:
  * `request`: The request to run. Generate these with one of the above `getFooRequest` methods.
  * `says`: Optional String. Tests that the speech output from the request is the string specified.
  * `saysNothing`: Optional Boolean. If true, tests that the response has no speech output.
  * `shouldEndSession`: Optional Boolean. If true, tests that the response to the request ends or does not end the session.
  * `callback`: Optional Function. Recieves the [response][response examples] object from the request as a parameter. You can make custom checks against the response using any assertion library you like in here.

## alexaTest.t(arguments)
Forwards the request to `alexaTest.i18n.t` and returns the result. You must have called `alexaTest.initializeI18N` previously.

# Note About DynamoDB
If your skill uses the [Alexa Skills Kit for Node.js][nodekit] and uses its built-in DynamoDB persistence, it may be desireable not to connect to the database during testing, since the ASK Node kit uses it to persist session attributes. For that case, the framework passes a fourth parameter of `true` to the `handler` function, which you can conditionalize on to disable the database connection.

[sessionendedrequest docs]: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-standard-request-types-reference#sessionendedrequest
[response examples]: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/alexa-skills-kit-interface-reference#response-examples
[nodekit]: https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs