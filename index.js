
const awsContext = require('aws-lambda-mock-context');
const AssertionError = require('assertion-error');
const uuid = require('node-uuid');

//TODO: newsession stuff?

CallbackContext = function(framework, sequenceIndex, locale, requestType)
{
	this.framework = framework;
	this.sequenceIndex = sequenceIndex;
	this.locale = locale;
	this.requestType = requestType;
}

/**
 * Formats text via i18n, using the locale that was used for the request.
 */
CallbackContext.prototype.t = function(keys, params)
{
	if (!params) params = {}
	if (!params.lng) params.lng = this.locale;
	return this.framework.t(keys, params);
}

/**
 * Throws an assertion error.
 * @param {object} data Data for the error. Can include:
 * `message`: Optionally, a message describing the failure.
 * `expected`: Optionally, the expected value.
 * `actual`: Optionally, the actual value.
 * `operator`: Optionally, the comparison operator that was used.
 * `showDiff`: Optionally, true if Mocha should diff the expected and actual values.
 */
CallbackContext.prototype.assert = function(data)
{
	this.framework._assert(this.sequenceIndex, this.requestType, data);
}

module.exports = {

	locale: "en",
	version: "1.0",

	/**
	 * Initializes necessary values before using the test framework.
	 * @param {object} index The object containing your skill's 'handler' method.
	 * @param {string} appId The Skill's app ID. Looks like "amzn1.ask.skill.00000000-0000-0000-0000-000000000000".
	 * @param {string} userId The Amazon User ID to test with. Looks like "amzn1.ask.account.LONG_STRING"
	 */
	initialize: function(index, appId, userId)
	{
		this.index = index;
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
	 * Changes the locale used by i18n and to generate requests.
	 * @param {string} locale E.g. "en-US"
	 */
	setLocale: function(locale)
	{
		if (!locale) throw "'locale' argument must be provided.";
		this.locale = locale;
		if (this.i18n) this.i18n.changeLanguage(this.locale);
	},

	/**
	 * Generates a launch request object.
	 * @param {string} locale Optional locale to use. If not specified, uses the locale specified by `setLocale`.
	 */
	getLaunchRequest: function(locale)
	{
		return {
			"version": this.version,
			"session": this._getSessionData(),
			"request": {
				"type": "LaunchRequest",
				"requestId": "EdwRequestId." + uuid.v4(),
				"timestamp": new Date().toISOString(),
				"locale": locale || this.locale,
			}
		};
	},

	/**
	 * Generates an intent request object.
	 * @param {string} intentName The name of the intent to call.
	 * @param {object} slots Slot data to call the intent with.
	 * @param {string} locale Optional locale to use. If not specified, uses the locale specified by `setLocale`.
	 */
	getIntentRequest: function(intentName, slots, locale)
	{
		if (!slots)
		{
			slots = {};
		}
		else
		{
			for (var key in slots) slots[key] = { name: key, value: slots[key] };
		}
		return {
			"version": this.version,
			"session": this._getSessionData(),
			"request": {
				"type": "IntentRequest",
				"requestId": "EdwRequestId." + uuid.v4(),
				"timestamp": new Date().toISOString(),
				"locale": locale || this.locale,
				"intent": { "name": intentName, "slots": slots }
			},
		};
	},

	/**
	 * Generates a sesson ended request object.
	 * @param {string} reason The reason the session was ended.
	 * @param {string} locale Optional locale to use. If not specified, uses the locale specified by `setLocale`.
	 * @see https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-standard-request-types-reference#sessionendedrequest
	 */
	getSessionEndedRequest: function(reason, locale)
	{
		return {
			"version": this.version,
			"session": this._getSessionData(),
			"request": {
				"type": "SessionEndedRequest",
				"requestId": "EdwRequestId." + uuid.v4(),
				"timestamp": new Date().toISOString(),
				"locale": locale || this.locale,
				"reason": reason
				//TODO: support error
			}
		};
	},

	/**
	 * Tests the responses of a sequence of requests to the skill.
	 * @param {object[]} sequence An array of requests to test. Each element can have these properties:
	 * `request`: The request to run. Generate these with one of the above `getFooRequest` methods.
	 * `says`: Optional String. Tests that the speech output from the request is the string specified.
	 * `saysNothing`: Optional Boolean. If true, tests that the response has no speech output.
	 * `shouldEndSession`: Optional Boolean. If true, tests that the response to the request ends or does not end the session.
	 * `saysCallback`: Optional Function. Recieves the speech from the response as a parameter. You can make custom checks against it using any assertion library you like.
	 * `callback`: Optional Function. Recieves the response object from the request as a parameter. You can make custom checks against the response using any assertion library you like in here.
	 */
	test: function(sequence)
	{
		if (!this.index) throw "The module is not initialized. You must call 'initialize' before calling 'test'.";
		if (!sequence) throw "'sequence' argument must be provided.";

		var index = this.index;
		var locale = this.locale;
		var self = this;

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
					request.session.attributes = attributes || {};
					handler(request, ctx, undefined, true);

					var requestType = request.request.type;
					if (requestType == "IntentRequest") requestType = request.request.intent.name;
					var context = new CallbackContext(self, sequenceIndex, locale, requestType);

					ctx.Promise
						.then(response => {
							//TODO: null checks

							var actualSay = response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
							
							// check the returned speech
							if (currentItem.says !== undefined)
							{
								var expected = "<speak> " + currentItem.says + " </speak>";
								if (expected != actualSay)
								{
									context.assert(
										{
											message: "the response did not return the correct speech",
											expected: expected, actual: actualSay ? actualSay : String(actualSay),
											operator: "==", showDiff: true
										});
								}
							}
							if (currentItem.saysNothing && actualSay)
							{
								context.assert(
									{
										message: "the response did not return the correct speech",
										expected: "undefined", actual: actualSay ? actualSay : String(actualSay),
										operator: "==", showDiff: true
									});
							}

							// check the shouldEndSession flag
							if (currentItem.shouldEndSession === true && !response.response.shouldEndSession)
							{
								context.assert(
									{
										message: "the response did not end the session",
										expected: "the response ends the session",
										actual: "the response did not end the session"
									});
							}
							else if (currentItem.shouldEndSession === false && response.response.shouldEndSession)
							{
								context.assert(
									{
										message: "the response ended the session",
										expected: "the response does not end the session",
										actual: "the response ended the session"
									});
							}

							// custom checks
							if (currentItem.saysCallback)
							{
								currentItem.saysCallback(context, actualSay);
							}
							//TODO: test
							if (currentItem.callback)
							{
								currentItem.callback(context, response);
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

	/**
	 * Internal method.
	 */
	_assert: function(sequenceIndex, requestType, data)
	{
		var message = "Request #" + (sequenceIndex+1) + " (" + requestType + ")";
		if (data.message)
		{
			message += ": " + data.message;
		}
		data.message = message;

		// the message has information that should be displayed by the test runner
		data.generatedMessage = false;
		
		data.name = "AssertionError";
		throw new AssertionError(message, data);
	},

	/**
	 * Internal method.
	 */
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