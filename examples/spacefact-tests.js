
/*
Mocha tests for the Alexa skill "Space Facts" example (https://github.com/alexa/skill-sample-nodejs-fact).
Using the Alexa Skill Test Framework (https://github.com/BrianMacIntosh/alexa-skill-test-framework).

Run with 'mocha helloworld-tests.js'.
*/

// include the testing framework
const alexaTest = require('alexa-skill-test-framework');

// initialize the testing framework
alexaTest.initialize(require('./spacefact.js'), "1.0", "amzn1.ask.skill.00000000-0000-0000-0000-000000000000", "amzn1.ask.account.VOID");

// initialize i18n
alexaTest.initializeI18N(require("./spacefact-language"));

//TODO: Test Facts
//TODO: Test reprompt strings
//TODO: test cards?

var supportedLocales = [ "en-US", "en-GB", "de-DE" ];

// perform all the tests in each supported language
for (var i = 0; i < supportedLocales.length; i++)
{
	// set the language
	//TODO: will not work if the skill really performs asynchronously
	alexaTest.setLocale(supportedLocales[i]);

	describe("Space Fact Skill (" + supportedLocales[i] + ")", function()
	{
		// tests the behavior of the skill's LaunchRequest
		describe("LaunchRequest", function()
		{
			alexaTest.test([
				{ request: alexaTest.getLaunchRequest(), shouldEndSession: true }
			]);
		});

		// tests the behavior of the skill's GetNewFactIntent
		describe("GetNewFactIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("GetNewFactIntent"), shouldEndSession: true }
			]);
		});

		// tests the behavior of the skill's AMAZON.HelpIntent
		describe("AMAZON.HelpIntent into GetNewFactIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("AMAZON.HelpIntent"), says: alexaTest.t("HELP_MESSAGE"), shouldEndSession: false },
				{ request: alexaTest.getIntentRequest("GetNewFactIntent"), shouldEndSession: true }
			]);
		});
		describe("AMAZON.HelpIntent into AMAZON.StopIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("AMAZON.HelpIntent"), says: alexaTest.t("HELP_MESSAGE"), shouldEndSession: false },
				{ request: alexaTest.getIntentRequest("AMAZON.CancelIntent"), says: alexaTest.t("STOP_MESSAGE"), shouldEndSession: true }
			]);
		});

		// tests the behavior of the skill's AMAZON.CancelIntent
		describe("AMAZON.CancelIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("AMAZON.CancelIntent"), says: alexaTest.t("STOP_MESSAGE"), shouldEndSession: true }
			]);
		});

		// tests the behavior of the skill's AMAZON.StopIntent
		describe("AMAZON.CancelIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("AMAZON.CancelIntent"), says: alexaTest.t("STOP_MESSAGE"), shouldEndSession: true }
			]);
		});
	});
}