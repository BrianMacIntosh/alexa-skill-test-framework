
const awsContext = require('aws-lambda-mock-context');
const AssertionError = require('assertion-error');

module.exports = {

	locale: "en-US",
	version: "1.0",

	/**
	 * Initializes necessary values before using the test framework.
	 * @param {object} index The object containing your skill's 'handler' method.
	 * @param {string} version The version of the skill to run. //TODO: test
	 * @param {string} appId The Skill's app ID. Looks like "amzn1.ask.skill.00000000-0000-0000-0000-000000000000".
	 * @param {string} userId The Amazon User ID to test with. Looks like "amzn1.ask.account.LONG_STRING"
	 */
	initialize: function(index, version, appId, userId)
	{
		this.index = index;
		this.version = "1.0";
		this.appId = appId;
		this.userId = userId;
	},

	/**
	 * Initializes i18n.
	 * @param {object} resources The 'resources' object to give to i18n.
	 */
	initializeI18N: function(resources)
	{
		this.i18n = require('i18next');
		var sprintf = require('i18next-sprintf-postprocessor');
		this.i18n.use(sprintf).init({
			overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
			returnObjects: true,
			lng: this.locale,
			resources: resources
		});
	},

	/**
	 * Changes the locale used by the skill.
	 * @param {string} locale E.g. "en-US"
	 */
	setLocale: function(locale)
	{
		this.locale = locale;
		if (this.i18n) this.i18n.changeLanguage(this.locale);
	},

	/**
	 * Generates a launch request object.
	 */
	getLaunchRequest: function()
	{
		return {
			"version": this.version,
			"session": this._getSessionData(),
			"request": {
				"type": "LaunchRequest",
				"requestId": "EdwRequestId.00000000-0000-0000-0000-000000000000", //TODO: randomize
				"timestamp": new Date().toISOString(),
				"locale": this.locale,
			}
		};
	},

	/**
	 * Generates an intent request object.
	 * @param {string} intentName The name of the intent to call.
	 * @param {object} slots Slot data to call the intent with.
	 */
	getIntentRequest: function(intentName, slots)
	{
		if (!slots)
		{
			slots = {};
		}
		else
		{
			for (var key in slots)
			{
				slots[key] = { name: key, value: slots[key] };
			}
		}
		return {
			"version": this.version,
			"session": this._getSessionData(),
			"request": {
				"type": "IntentRequest",
				"requestId": "EdwRequestId.00000000-0000-0000-0000-000000000000", //TODO: randomize
				"timestamp": new Date().toISOString(),
				"locale": this.locale,
				"intent": { "name": intentName, "slots": slots }
			},
		};
	},

	/**
	 * Generates a sesson ended request object.
	 * @param {string} reason The reason the session was ended.
	 * @see https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-standard-request-types-reference#sessionendedrequest
	 */
	getSessionEndedRequest: function(reason)
	{
		return {
			"version": this.version,
			"session": this._getSessionData(),
			"request": {
				"type": "SessionEndedRequest",
				"requestId": "EdwRequestId.00000000-0000-0000-0000-000000000000", //TODO: randomize
				"timestamp": new Date().toISOString(),
				"locale": this.locale,
				"reason": reason
				//TODO: support error
			}
		};
	},

	/**
	 * Tests the responses of a sequence of requests to the skill.
	 * @param {object[]} sequence A sequence of paired requests and results to check.
	 * //TODO: doc
	 */
	test: function(sequence)
	{
		if (!this.index) throw "The module is not initialized. You must call 'initialize' before calling 'test'.";

		var index = this.index;

		it("returns the correct responses", function(done) {
			var run = function(handler, sequenceIndex, attributes)
			{
				if (sequenceIndex >= sequence.length)
				{
					// all requests were executed
					done();
				}
				else
				{
					var ctx = awsContext();
					var currentItem = sequence[sequenceIndex];
					
					var request = currentItem.request;
					request.session.attributes = attributes;
					handler(request, ctx, undefined, true);

					ctx.Promise
						.then(response => {

							var requestType = request.request.type;
							if (requestType == "IntentRequest") requestType = request.request.intent.name;

							// check the returned speech
							var actualSay = response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
							if (currentItem.says !== undefined)
							{
								var expected = "<speak> " + currentItem.says + " </speak>";
								if (expected != actualSay)
								{
									throw new AssertionError(
										"Request #" + (sequenceIndex+1) + " (" + requestType + ") did not return the correct speech.",
										{
											name: "AssertionError",
											expected: expected, actual: actualSay ? actualSay : String(actualSay), operator: "==",
											generatedMessage: true, showDiff: true
										});
								}
							}
							if (currentItem.saysNothing && actualSay)
							{
								throw new AssertionError(
									"Request #" + (sequenceIndex+1) + " (" + requestType + ") did not return the correct speech.",
									{
										name: "AssertionError",
										expected: "undefined", actual: actualSay ? actualSay : String(actualSay), operator: "==",
										generatedMessage: true, showDiff: true
									});
							}

							// check the shouldEndSession flag
							if (currentItem.shouldEndSession === true && !response.response.shouldEndSession)
							{
								throw new AssertionError(
									"Request #" + (sequenceIndex+1) + " (" + requestType + ") did not end the session.",
									{
										name: "AssertionError",
										expected: "the response ends the session", actual: "the response did not end the session"
									});
							}
							else if (currentItem.shouldEndSession === false && response.response.shouldEndSession)
							{
								throw new AssertionError(
									"Request #" + (sequenceIndex+1) + " (" + requestType + ") ended the session.",
									{
										name: "AssertionError",
										expected: "the response does not end the session", actual: "the response ended the session"
									});
							}

							// custom checks
							//TODO: test
							if (currentItem.callback)
							{
								currentItem.callback(response);
							}

							run(handler, sequenceIndex + 1, response.sessionAttributes);
						})
						.catch(done);
				}
			}
			run(index.handler, 0, {});
		});
	},

	/**
	 * Formats text via i18n.
	 */
	t: function()
	{
		if (!this.i18n) throw "i18n is not initialized. You must call 'initializeI18N' before calling 't'.";
		return this.i18n.t.apply(this.i18n, arguments);
	},

	_getSessionData: function()
	{
		return {
				"sessionId": "SessionId.00000000-0000-0000-0000-000000000000", //TODO: randomize
				"application": { "applicationId": this.appId },
				"attributes": {},
				"user": { "userId": this.appId },
				"new": true
			};
	}

}