const awsContext = require('aws-lambda-mock-context');
const AssertionError = require('assertion-error');
const uuid = require('uuid');

const CallbackContext = function (framework, sequenceIndex, locale, requestType) {
	'use strict';
	this.framework = framework;
	this.sequenceIndex = sequenceIndex;
	this.locale = locale;
	this.requestType = requestType;
};

/**
 * Formats text via i18n, using the locale that was used for the request.
 */
CallbackContext.prototype.t = function (keys, params) {
	'use strict';
	if (!params) {
		params = {};
	}
	if (!params.lng) {
		params.lng = this.locale;
	}
	return this.framework.t(keys, params);
};

/**
 * Throws an assertion error.
 * @param {object} data Data for the error. Can include:
 * `message`: Optionally, a message describing the failure.
 * `expected`: Optionally, the expected value.
 * `actual`: Optionally, the actual value.
 * `operator`: Optionally, the comparison operator that was used.
 * `showDiff`: Optionally, true if Mocha should diff the expected and actual values.
 */
CallbackContext.prototype.assert = function (data) {
	'use strict';
	this.framework._assert(this.sequenceIndex, this.requestType, data);
};

/**
 * Performs the questionMarkCheck on the response, and asserts if it fails.
 */
CallbackContext.prototype._questionMarkCheck = function (response) {
	'use strict';
	var actualSay = response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
	
	var hasQuestionMark = false;
	for (var i = 0; actualSay && i < actualSay.length; i++) {
		var c = actualSay[i];
		if (c === '?' || c === '\u055E' || c === '\u061F' || c === '\u2E2E' || c === '\uFF1F') {
			hasQuestionMark = true;
			break;
		}
	}
	if (response.response.shouldEndSession && hasQuestionMark) {
		this.assert(
			{
				message: "Possible Certification Problem: The response ends the session but contains a question mark."
			});
	}
	if (!response.response.shouldEndSession && !hasQuestionMark) {
		this.assert(
			{
				message: "Possible Certification Problem: The response keeps the session open but does not contain a question mark."
			});
	}
};

module.exports = {
	
	locale: "en-US",
	version: "1.0",
	
	//TODO: allow these to be enabled or disabled on a per-request basis
	extraFeatures: {
		/**
		 * If set, responses that end with question marks must not end the session,
		 * and those without question marks must end the session.
		 */
		questionMarkCheck: true,
	},
	
	/**
	 * Initializes necessary values before using the test framework.
	 * @param {object} index The object containing your skill's 'handler' method.
	 * @param {string} appId The Skill's app ID. Looks like "amzn1.ask.skill.00000000-0000-0000-0000-000000000000".
	 * @param {string} userId The Amazon User ID to test with. Looks like "amzn1.ask.account.LONG_STRING"
	 */
	initialize: function (index, appId, userId) {
		'use strict';
		this.index = index;
		this.appId = appId;
		this.userId = userId;
	},
	
	/**
	 * Initializes i18n.
	 * @param {object} resources The 'resources' object to give to i18n.
	 */
	initializeI18N: function (resources) {
		'use strict';
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
	setLocale: function (locale) {
		'use strict';
		if (!locale) {
			throw "'locale' argument must be provided.";
		}
		this.locale = locale;
		if (this.i18n) {
			this.i18n.changeLanguage(this.locale);
		}
	},
	
	/**
	 * Enables or disables an optional testing feature.
	 * @param {string} key The key of the feature to enable.
	 * @param {boolean} enabled Whether the feature should be enabled.
	 */
	setExtraFeature: function (key, enabled) {
		'use strict';
		if (this.extraFeatures[key] === undefined) {
			throw "Framework has no feature with key '" + key + "'.";
		}
		this.extraFeatures[key] = !!enabled;
	},
	
	/**
	 * Generates a launch request object.
	 * @param {string} locale Optional locale to use. If not specified, uses the locale specified by `setLocale`.
	 */
	getLaunchRequest: function (locale) {
		'use strict';
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
	getIntentRequest: function (intentName, slots, locale) {
		'use strict';
		if (!slots) {
			slots = {};
		}
		else {
			for (var key in slots) {
				slots[key] = {name: key, value: slots[key]};
			}
		}
		return {
			"version": this.version,
			"session": this._getSessionData(),
			"request": {
				"type": "IntentRequest",
				"requestId": "EdwRequestId." + uuid.v4(),
				"timestamp": new Date().toISOString(),
				"locale": locale || this.locale,
				"intent": {"name": intentName, "slots": slots}
			},
		};
	},
	
	/**
	 * Generates a sesson ended request object.
	 * @param {string} reason The reason the session was ended.
	 * @param {string} locale Optional locale to use. If not specified, uses the locale specified by `setLocale`.
	 * @see https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-standard-request-types-reference#sessionendedrequest
	 */
	getSessionEndedRequest: function (reason, locale) {
		'use strict';
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
	 * `saysLike`: Optional String. Tests that the speech output from the request contains the string specified.
	 * `saysNothing`: Optional Boolean. If true, tests that the response has no speech output.
	 * `reprompts`: Optional String. Tests that the reprompt output from the request is the string specified.
	 * `repromptsLike`: Optional String. Tests that the reprompt output from the request contains the string specified.
	 * `repromptsNothing`: Optional Boolean. If true, tests that the response has no reprompt output.
	 * `shouldEndSession`: Optional Boolean. If true, tests that the response to the request ends or does not end the session.
	 * `saysCallback`: Optional Function. Recieves the speech from the response as a parameter. You can make custom checks against it using any assertion library you like.
	 * `callback`: Optional Function. Recieves the response object from the request as a parameter. You can make custom checks against the response using any assertion library you like in here.
	 * `elicitsSlot`: Optional String. Tests that the response asks Alexa to elicit the given slot.
	 * `confirmsSlot`: Optional String. Tests that the response asks Alexa to confirm the given slot.
	 * `confirmsIntent`: Optional Boolean. Tests that the response asks Alexa to confirm the intent.
	 * `hasAttributes`: Optional Object. Tests that the response contains the given attributes and values.
	 * `hasCardTitle`: Optional String. Tests that the card sent by the response has the title specified.
	 * `hasCardContent`: Optional String. Tests that the card sent by the response has the title specified.
	 * @param {string} testDescription An optional description for the mocha test
	 */
	test: function (sequence, testDescription) {
		'use strict';
		if (!this.index) {
			throw "The module is not initialized. You must call 'initialize' before calling 'test'.";
		}
		if (!sequence) {
			throw "'sequence' argument must be provided.";
		}
		
		var randomSessionId = `SessionId.${uuid.v4()}`;
		
		var index = this.index;
		var locale = this.locale;
		var self = this;
		
		it(testDescription || "returns the correct responses", function (done) {
			var run = function (handler, sequenceIndex, attributes) {
				if (sequenceIndex >= sequence.length) {
					// all requests were executed
					done();
				}
				else {
					var ctx = awsContext();
					var currentItem = sequence[sequenceIndex];
					
					var request = currentItem.request;
					request.session.new = sequenceIndex === 0;
					if (attributes) {
						request.session.attributes = JSON.parse(JSON.stringify(attributes));
					} else {
						request.session.attributes = {};
					}
					request.session.sessionId = randomSessionId;
					var callback = function (err, result) {
						if (err) {
							return ctx.fail(err);
						}
						return ctx.succeed(result);
					};
					handler(request, ctx, callback, true);
					
					var requestType = request.request.type;
					if (requestType === "IntentRequest") {
						requestType = request.request.intent.name;
					}
					var context = new CallbackContext(self, sequenceIndex, locale, requestType);
					
					ctx.Promise
						.then(response => {
							//TODO: null checks
							
							if (response.toJSON) {
								response = response.toJSON();
							}
							
							var actualSay = response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
							var actualReprompt = response.response.reprompt ? response.response.reprompt.outputSpeech.ssml : undefined;
							
							// check the returned speech
							if (currentItem.says !== undefined) {
								let expected = "<speak> " + currentItem.says + " </speak>";
								self._assertStringEqual(context, "speech", actualSay, expected);
							}
							if (currentItem.saysLike !== undefined) {
								self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
							}
							if (currentItem.saysNothing) {
								self._assertStringMissing(context, "speech", actualSay);
							}
							if (currentItem.reprompts !== undefined) {
								let expected = "<speak> " + currentItem.reprompts + " </speak>";
								self._assertStringEqual(context, "reprompt", actualReprompt, expected);
							}
							if (currentItem.repromptsLike !== undefined) {
								self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
							}
							if (currentItem.repromptsNothing) {
								self._assertStringMissing(context, "reprompt", actualReprompt);
							}
							
							if (currentItem.elicitsSlot) {
								let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
								let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
								self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
							}
							
							if (currentItem.confirmsSlot) {
								let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
								let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
								self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
							}
							
							if (currentItem.confirmsIntent) {
								let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
								if (!confirmSlotDirective) {
									context.assert({message: "the response did not ask Alexa to confirm the intent"});
								}
							}
							
							if (currentItem.hasAttributes) {
								for (let att in currentItem.hasAttributes) {
									if (currentItem.hasAttributes.hasOwnProperty(att)) {
										self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
									}
								}
							}
							
							if (currentItem.hasCardTitle) {
								if (!response.response.card) {
									context.assert({message: "the response did not contain a card"});
								} else {
									self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
								}
							}
							
							if (currentItem.hasCardContent) {
								if (!response.response.card) {
									context.assert({message: "the response did not contain a card"});
								} else {
									self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
								}
							}
							
							// check the shouldEndSession flag
							if (currentItem.shouldEndSession === true && !response.response.shouldEndSession) {
								context.assert(
									{
										message: "the response did not end the session",
										expected: "the response ends the session",
										actual: "the response did not end the session"
									});
							}
							else if (currentItem.shouldEndSession === false && response.response.shouldEndSession) {
								context.assert(
									{
										message: "the response ended the session",
										expected: "the response does not end the session",
										actual: "the response ended the session"
									});
							}
							
							// custom checks
							if (currentItem.saysCallback) {
								currentItem.saysCallback(context, actualSay);
							}
							if (currentItem.callback) {
								currentItem.callback(context, response);
							}
							
							// extra checks
							if (self.extraFeatures.questionMarkCheck) {
								context._questionMarkCheck(response);
							}
							
							run(handler, sequenceIndex + 1, response.sessionAttributes);
						})
						.catch(done);
				}
			};
			run(index.handler, 0, {});
		});
	},
	
	/**
	 * Formats text via i18n.
	 */
	t: function () {
		'use strict';
		if (!this.i18n) {
			throw "i18n is not initialized. You must call 'initializeI18N' before calling 't'.";
		}
		return this.i18n.t.apply(this.i18n, arguments);
	},
	
	/**
	 * Internal method. Asserts if the strings are not equal.
	 */
	_assertStringEqual: function (context, name, actual, expected) {
		'use strict';
		if (expected !== actual) {
			context.assert(
				{
					message: "the response did not return the correct " + name + " value",
					expected: expected, actual: actual ? actual : String(actual),
					operator: "==", showDiff: true
				});
		}
	},
	
	/**
	 * Internal method. Asserts if the strings are not equal.
	 */
	_assertStringContains: function (context, name, actual, substring) {
		'use strict';
		if (actual.indexOf(substring) < 0) {
			context.assert(
				{
					message: "the response did not contain the correct " + name + " value",
					expected: substring, actual: actual ? actual : String(actual),
					operator: "LIKE", showDiff: true
				});
		}
	},
	
	/**
	 * Internal method. Asserts if the string exists.
	 */
	_assertStringMissing: function (context, name, actual) {
		'use strict';
		if (actual) {
			context.assert(
				{
					message: "the response unexpectedly returned a " + name + " value",
					expected: "undefined", actual: actual ? actual : String(actual),
					operator: "==", showDiff: true
				});
		}
	},
	
	/**
	 * Internal method.
	 */
	_assert: function (sequenceIndex, requestType, data) {
		'use strict';
		var message = "Request #" + (sequenceIndex + 1) + " (" + requestType + ")";
		if (data.message) {
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
	_getSessionData: function () {
		'use strict';
		return {
			// randomized for every session and set before calling the handler
			"sessionId": "SessionId.00000000-0000-0000-0000-000000000000",
			"application": {"applicationId": this.appId},
			"attributes": {},
			"user": {"userId": this.userId},
			"new": true
		};
	},
	
	/**
	 * Internal method.
	 */
	_getDirectiveFromResponse: function (response, type) {
		'use strict';
		let directives = response.response.directives;
		if (directives) {
			for (let i = 0; i < directives.length; i++) {
				if (directives[i].type === type) {
					return directives[i];
				}
			}
		}
		return undefined;
	}
};
