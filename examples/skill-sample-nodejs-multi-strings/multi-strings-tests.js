// include the testing framework
//const alexaTest = require('alexa-skill-test-framework');
const alexaTest = require('../../index');

// initialize the testing framework
alexaTest.initialize(
	require('./multi-strings'),
	'amzn1.ask.skill.00000000-0000-0000-0000-000000000000',
	'amzn1.ask.account.VOID');

describe("Hello World Skill with MultiStrings", () => {
	'use strict';
	// tests the behavior of the skill's LaunchRequest
	describe("LaunchRequest", function () {
		alexaTest.test([
			{
				request: alexaTest.getLaunchRequest(),
				says: ['Hello, how are you?', 'Hi, what\'s up?', 'Good day, how are you doing?'],
				reprompts: ['How are you?', 'How do you feel?'],
				shouldEndSession: false
			}
		]);
	});
	
	// tests the behavior of the skill's HelloWorldIntent
	describe("HelloWorldIntent", function () {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest('HelloWorldIntent'),
				says: ['Hello, how are you?', 'Hi, what\'s up?', 'Good day, how are you doing?'],
				reprompts: ['How are you?', 'How do you feel?'],
				shouldEndSession: false
			}
		]);
	});
});
