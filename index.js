const awsContext = require('aws-lambda-mock-context');
const AssertionError = require('assertion-error');
const AWSMOCK = require('aws-sdk-mock');
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
	if (response.response.shouldEndSession !== false && hasQuestionMark) {
		this.assert(
			{
				message: "Possible Certification Problem: The response ends the session but contains a question mark."
			});
	}
	if (response.response.shouldEndSession === false && !hasQuestionMark) {
		this.assert(
			{
				message: "Possible Certification Problem: The response keeps the session open but does not contain a question mark."
			});
	}
};

module.exports = {
	
	locale: "en-US",
	version: "1.0",
	
	// lambda mock context options
	mockContextOptions: {},
	
	// DynamoDB Mock
	dynamoDBTable: null,
	partitionKeyName: null,
	attributesName: null,
	dynamoDBGetMock: null,
	dynamoDBPutMock: null,
	
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
	 * @param {string} deviceId Optional The Amazon Device ID to test with. Looks like "amzn1.ask.device.LONG_STRING"
	 */
	initialize: function (index, appId, userId, deviceId) {
		'use strict';
		this.index = index;
		this.appId = appId;
		this.userId = userId;
		this.deviceId = deviceId || 'amzn1.ask.device.VOID';
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
	 * Set lambda mock context options
	 * @param {object} aws-lambda-mock-context options
	 */
	setMockContextOptions: function (opts) {
		'use strict';
		if (!opts) {
			throw "'opts' argument must be provided.";
		}
		this.mockContextOptions = opts;
	},
	
	/**
	 * Activates mocking of DynamoDB backed attributes
	 * @param {string} tableName name of the DynamoDB Table
	 * @param {string} partitionKeyName the key to be used as id (default: userId)
	 * @param {string} attributesName the key to be used for the attributes (default: mapAttr)
	 */
	setDynamoDBTable: function (tableName, partitionKeyName, attributesName) {
		'use strict';
		if (!tableName) {
			throw "'tableName' argument must be provided.";
		}
		this.dynamoDBTable = tableName;
		this.partitionKeyName = partitionKeyName || 'userId';
		this.attributesName = attributesName || 'mapAttr';
		
		let self = this;
		AWSMOCK.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
			// Do not inline; resolution has to take place on call
			self.dynamoDBGetMock(params, callback);
		});
		AWSMOCK.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
			// Do not inline; resolution has to take place on call
			self.dynamoDBPutMock(params, callback);
		});
	},
	
	/**
	 * Reset the mock on the DynamoDB
	 */
	unmockDynamoDB: function () {
		'use strict';
		AWSMOCK.restore('DynamoDB.DocumentClient');
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
			"context": this._getContextData(),
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
		var requestSlots;
		if (!slots) {
			requestSlots = {};
		}
		else {
			requestSlots = JSON.parse(JSON.stringify(slots));
			for (var key in requestSlots) {
				requestSlots[key] = {name: key, value: requestSlots[key]};
			}
		}
		return {
			"version": this.version,
			"session": this._getSessionData(),
			"context": this._getContextData(),
			"request": {
				"type": "IntentRequest",
				"requestId": "EdwRequestId." + uuid.v4(),
				"timestamp": new Date().toISOString(),
				"locale": locale || this.locale,
				"intent": {"name": intentName, "slots": requestSlots}
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
			"context": this._getContextData(),
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
	 * Adds an AudioPlayer context to the given request.
	 * @param {object} request The intent request to modify.
	 * @param {string} token An opaque token that represents the audio stream described by this AudioPlayer object. You provide this token when sending the Play directive.
	 * @param {string} offset Identifies a track’s offset in milliseconds at the time the request was sent. This is 0 if the track is at the beginning.
	 * @param {string} activity Indicates the last known state of audio playback.
	 * @return {object} the given intent request to allow chaining.
	 */
	addAudioPlayerContextToRequest: function (request, token, offset, activity) {
		'use strict';
		if (!request) {
			throw 'request must be specified to add entity resolution';
		}
		
		if (token) {
			request.context.AudioPlayer.token = token;
		}
		if (offset) {
			request.context.AudioPlayer.offsetInMilliseconds = offset;
		}
		if (activity) {
			request.context.AudioPlayer.playerActivity = activity;
		}
		return request;
	},
	
	/**
	 * Adds an entity resolution to the given request.
	 * @param {object} request The intent request to modify.
	 * @param {string} slotName The name of the slot to add the resolution to. If the slot does not exist it is added.
	 * @param {string} slotType The type of the slot.
	 * @param {string} value The value of the slot.
	 * @param {string} id The id of the resolved entity.
	 * @return {object} the given intent request to allow chaining.
	 */
	addEntityResolutionToRequest: function (request, slotName, slotType, value, id) {
		'use strict';
		if (!request) {
			throw 'request must be specified to add entity resolution';
		}
		if (!slotName) {
			throw 'slotName must be specified to add entity resolution';
		}
		if (!value) {
			throw 'value must be specified to add entity resolution';
		}
		
		if (!request.request.intent.slots[slotName]) {
			request.request.intent.slots[slotName] = {name: slotName, value: value};
		}
		
		const authority = "amzn1.er-authority.echo-sdk." + this.appId + "." + slotType;
		var valueAdded = false;
		if (request.request.intent.slots[slotName].resolutions) {
			request.request.intent.slots[slotName].resolutions.resolutionsPerAuthority.forEach(rpa => {
				if (!valueAdded && (rpa.authority === authority)) {
					rpa.values.push({
						"value": {
							"name": value,
							"id": id
						}
					});
					valueAdded = true;
				}
			});
		} else {
			request.request.intent.slots[slotName].resolutions = {
				"resolutionsPerAuthority": []
			};
		}
		if (!valueAdded) {
			request.request.intent.slots[slotName].resolutions.resolutionsPerAuthority.push({
				"authority": authority,
				"status": {
					"code": "ER_SUCCESS_MATCH"
				},
				"values": [
					{
						"value": {
							"name": value,
							"id": id
						}
					}
				]
			});
		}
		
		return request;
	},
	
	/**
	 * Adds multiple entity resolutions to the given request.
	 * @param {object} request The intent request to modify.
	 * @param {array} resolutions The array containing the resolutions to add
	 * @return {object} the given intent request to allow chaining.
	 */
	addEntityResolutionsToRequest: function (request, resolutions) {
		'use strict';
		let alexaTest = this;
		resolutions.forEach(resolution => {
			alexaTest.addEntityResolutionToRequest(request, resolution.slotName, resolution.slotType, resolution.value, resolution.id);
		});
		return request;
	},
	
	/**
	 * Adds an entity resolution with code ER_SUCCESS_NO_MATCH to the given request.
	 * @param {object} request The intent request to modify.
	 * @param {string} slotName The name of the slot to add the resolution to. If the slot does not exist it is added.
	 * @param {string} slotType The type of the slot.
	 * @param {string} value The value of the slot.
	 * @return {object} the given intent request to allow chaining.
	 */
	addEntityResolutionNoMatchToRequest: function (request, slotName, slotType, value) {
		'use strict';
		if (!request) {
			throw 'request must be specified to add entity resolution';
		}
		if (!slotName) {
			throw 'slotName must be specified to add entity resolution';
		}
		if (!value) {
			throw 'value must be specified to add entity resolution';
		}
		
		if (!request.request.intent.slots[slotName]) {
			request.request.intent.slots[slotName] = {name: slotName, value: value};
		}
		
		if (!request.request.intent.slots[slotName].resolutions) {
			request.request.intent.slots[slotName].resolutions = {
				"resolutionsPerAuthority": []
			};
		}
		request.request.intent.slots[slotName].resolutions.resolutionsPerAuthority.push({
			"authority": "amzn1.er-authority.echo-sdk." + this.appId + "." + slotType,
			"status": {
				"code": "ER_SUCCESS_NO_MATCH"
			}
		});
		
		return request;
	},
	
	/**
	 * Tests the responses of a sequence of requests to the skill.
	 * @param {object[]} sequence An array of requests to test. Each element can have these properties:
	 * `request`: The request to run. Generate these with one of the above `getFooRequest` methods.
	 * `says`: Optional String or Array of Strings. Tests that the speech output from the request is the string specified.
	 * `saysLike`: Optional String. Tests that the speech output from the request contains the string specified.
	 * `saysNothing`: Optional Boolean. If true, tests that the response has no speech output.
	 * `reprompts`: Optional String or Array of Strings. Tests that the reprompt output from the request is the string specified.
	 * `repromptsLike`: Optional String. Tests that the reprompt output from the request contains the string specified.
	 * `repromptsNothing`: Optional Boolean. If true, tests that the response has no reprompt output.
	 * `shouldEndSession`: Optional Boolean. If true, tests that the response to the request ends or does not end the session.
	 * `saysCallback`: Optional Function. Recieves the speech from the response as a parameter. You can make custom checks against it using any assertion library you like.
	 * `callback`: Optional Function. Recieves the response object from the request as a parameter. You can make custom checks against the response using any assertion library you like in here.
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
	 * `withStoredAttributes`: Optional Object. The attributes to initialize the handler with. Used with DynamoDB mock. Values can be strings or functions testing the value.
	 * `storesAttributes`: Optional Object. Tests that the given attributes were stored in the DynamoDB.
	 * `playsStream`: Optional Object. Tests that the AudioPlayer is used to play a stream.
	 * `stopsStream`: Optional Boolean. Tests that the AudioPlayer is stopped.
	 * `clearsQueue`: Optional String. Tests that the AudioPlayer clears the queue with the given clear behavior.
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
					var ctx = awsContext(self.mockContextOptions);
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
					
					var requestType = request.request.type;
					if (requestType === "IntentRequest") {
						requestType = request.request.intent.name;
					}
					var context = new CallbackContext(self, sequenceIndex, locale, requestType);
					
					if (self.dynamoDBTable) {
						self.dynamoDBGetMock = (params, callback) => {
							self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
							self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
							
							const Item = {};
							Item[self.partitionKeyName] = self.userId;
							Item[self.attributesName] = currentItem.withStoredAttributes || {};
							callback(null, {TableName: self.dynamoDBTable, Item});
						};
						self.dynamoDBPutMock = (params, callback) => {
							self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
							self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
							let storesAttributes = currentItem.storesAttributes;
							if (storesAttributes) {
								for (let att in storesAttributes) {
									if (storesAttributes.hasOwnProperty(att)) {
										const storedAttr = params.Item[self.attributesName][att];
										if (typeof storesAttributes[att] === "function") {
											if (!storesAttributes[att](storedAttr)) {
												context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
											}
										} else {
											self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
										}
									}
								}
							}
							callback(null, {});
						};
					}
					
					var result = handler(request, ctx, callback, true);
					if (result) {
						if (result.then) {
							result.then(ctx.succeed, ctx.fail);
						} else {
							ctx.succeed(result);
						}
					}
					
					ctx.Promise
						.then(response => {
							//TODO: null checks
							
							if (response.toJSON) {
								response = response.toJSON();
							}
							
							var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
							var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
							
							// check the returned speech
							if (currentItem.says !== undefined) {
								self._assertStringPresent(context, 'speech', actualSay);
								var trimActualSay = actualSay.substring(7);
								trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
								if (Array.isArray(currentItem.says)) {
									self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
								} else {
									self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
								}
							}
							if (currentItem.saysLike !== undefined) {
								self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
							}
							if (currentItem.saysNothing) {
								self._assertStringMissing(context, "speech", actualSay);
							}
							if (currentItem.reprompts !== undefined) {
								self._assertStringPresent(context, 'reprompt', actualReprompt);
								var trimActualReprompt = actualReprompt.substring(7);
								trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
								if (Array.isArray(currentItem.reprompts)) {
									self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
								} else {
									self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
								}
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
										if (typeof currentItem.hasAttributes[att] === "function") {
											if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
												context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
											}
										} else {
											self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
										}
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
								} else if (response.response.card.type !== "Simple") {
									context.assert({ message: "the card in the response was not a simple card" });
								} else {
									self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
								}
							}

							if (currentItem.hasCardContentLike) {
								if (!response.response.card) {
									context.assert({ message: "the response did not contain a card" });
								} else if (response.response.card.type !== "Simple") {
									context.assert({ message: "the card in the response was not a simple card" });
								} else {
									self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
								}
							}

							if (currentItem.hasCardText) {
								if (!response.response.card) {
									context.assert({ message: "the response did not contain a card" });
								} else if (response.response.card.type !== "Standard") {
									context.assert({ message: "the card in the response was not a standard card" });
								} else {
									self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
								}
							}

							if (currentItem.hasCardTextLike) {
								if (!response.response.card) {
									context.assert({ message: "the response did not contain a card" });
								} else if (response.response.card.type !== "Standard") {
									context.assert({ message: "the card in the response was not a standard card" });
								} else {
									self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
								}
							}

							if (currentItem.hasSmallImageUrlLike) {
								if (!response.response.card) {
									context.assert({ message: "the response did not contain a card" });
								} else if (response.response.card.type !== "Standard") {
									context.assert({ message: "the card in the response was not a standard card" });
								} else if (!response.response.card.image) {
									context.assert({ message: "the card in the response did not contain an image" });
								} else {
									self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
								}
							}

							if (currentItem.hasLargeImageUrlLike) {
								if (!response.response.card) {
									context.assert({ message: "the response did not contain a card" });
								} else if (response.response.card.type !== "Standard") {
									context.assert({ message: "the card in the response was not a standard card" });
								} else if (!response.response.card.image) {
									context.assert({ message: "the card in the response did not contain an image" });
								} else {
									self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
								}
							}

							// check the shouldEndSession flag
							if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
								context.assert(
									{
										message: "the response did not end the session",
										expected: "the response ends the session",
										actual: "the response did not end the session"
									});
							}
							else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
								context.assert(
									{
										message: "the response ended the session",
										expected: "the response does not end the session",
										actual: "the response ended the session"
									});
							}
							
							checkAudioPlayer(self, context, response, currentItem);
							
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
	 * Internal method. Asserts if the string is not part of the array.
	 */
	_assertStringOneOf: function (context, name, actual, expectedArray) {
		'use strict';
		for (let i = 0; i < expectedArray.length; i++) {
			if (actual === expectedArray[i]) {
				return;
			}
		}
		context.assert(
			{
				message: "the response did not contain a valid speechOutput",
				expected: "one of [" + expectedArray.map(text => `"${text}"`).join(', ') + "]",
				actual: actual,
				operator: "==", showDiff: true
			});
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
	 * Internal method. Asserts if the string exists.
	 */
	_assertStringPresent: function (context, name, actual) {
		'use strict';
		if (!actual) {
			context.assert(
				{
					message: "the response did not return a " + name + " value",
					expected: "some value", actual: actual ? actual : String(actual),
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
	_getContextData: function () {
		'use strict';
		return {
			"System": {
				"application": {"applicationId": this.appId},
				"user": {"userId": this.userId},
				"device": {
					"deviceId": this.deviceId,
					"supportedInterfaces": {
						"AudioPlayer": {}
					}
				},
				"apiEndpoint": "https://api.amazonalexa.com/"
			},
			"AudioPlayer": {
				"playerActivity": "IDLE"
			}
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

const checkAudioPlayer = (self, context, response, currentItem) => {
	'use strict';
	
	if (currentItem.playsStream) {
		let playDirective = self._getDirectiveFromResponse(response, 'AudioPlayer.Play');
		if (!playDirective) {
			context.assert({message: "the response did not play a stream"});
			return;
		}
		
		let playConfig = currentItem.playsStream;
		self._assertStringEqual(context, "playBehavior", playDirective.playBehavior, playConfig.behavior);
		
		let stream = playDirective.audioItem.stream;
		if (!stream.url.startsWith('https://')) {
			context.assert({message: "the stream URL is not https"});
		}
		self._assertStringEqual(context, "url", stream.url, playConfig.url);
		
		if (playConfig.token) {
			self._assertStringEqual(context, "token", stream.token, playConfig.token);
		}
		if (playConfig.previousToken) {
			self._assertStringEqual(context, "expectedPreviousToken", stream.expectedPreviousToken, playConfig.previousToken);
		}
		if (playConfig.offset || playConfig.offset === 0) {
			self._assertStringEqual(context, "offsetInMilliseconds", stream.offsetInMilliseconds.toString(), playConfig.offset.toString());
		}
	}
	
	if (currentItem.stopsStream) {
		if (!self._getDirectiveFromResponse(response, 'AudioPlayer.Stop')) {
			context.assert({message: "the response did not stop the stream"});
			return;
		}
	}
	
	if (currentItem.clearsQueue) {
		let clearDirective = self._getDirectiveFromResponse(response, 'AudioPlayer.ClearQueue');
		if (!clearDirective) {
			context.assert({message: "the response did not clear the audio queue"});
			return;
		}
		self._assertStringEqual(context, "clearBehavior", clearDirective.clearBehavior, currentItem.clearsQueue);
	}
};
