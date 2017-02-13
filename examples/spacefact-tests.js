
/*
Mocha tests for the Alexa skill "Space Facts" example (https://github.com/alexa/skill-sample-nodejs-fact).
Using the Alexa Skill Test Framework (https://github.com/BrianMacIntosh/alexa-skill-test-framework).

Run with 'mocha helloworld-tests.js'.
*/

// include the testing framework
//const alexaTest = require('alexa-skill-test-framework');
const alexaTest = require('../index');

// initialize the testing framework
alexaTest.initialize(
	require('./spacefact.js'),
	"amzn1.ask.skill.00000000-0000-0000-0000-000000000000",
	"amzn1.ask.account.VOID");

// initialize i18n
var textResources = require("./spacefact-language");
alexaTest.initializeI18N(textResources);

var supportedLocales = [ "en-US", "en-GB", "de-DE" ];

// perform each test in each supported language
for (var i = 0; i < supportedLocales.length; i++)
{
	var locale = supportedLocales[i];

	// set the language
	alexaTest.setLocale(locale);

	// callback function that asserts if the provided string is not a fact from the list
	var assertIfNotFact = function(context, suspectedFact)
	{
		var facts = context.t("FACTS");
		for (var i = 0; i < facts.length; i++)
		{
			if (suspectedFact === "<speak> " + context.t("GET_FACT_MESSAGE") + facts[i] + " </speak>") return;
		}
		context.assert({ message: "'" + suspectedFact + "' is not a space fact." });
	}

	describe("Space Fact Skill (" + locale + ")", function()
	{
		// tests the behavior of the skill's LaunchRequest
		describe("LaunchRequest", function()
		{
			alexaTest.test([
				{
					request: alexaTest.getLaunchRequest(), shouldEndSession: true,
					saysCallback: assertIfNotFact
				}
			]);
		});

		// tests the behavior of the skill's GetNewFactIntent
		describe("GetNewFactIntent", function()
		{
			alexaTest.test([
				{
					request: alexaTest.getIntentRequest("GetNewFactIntent"), shouldEndSession: true,
					saysCallback: assertIfNotFact
				}
			]);
		});

		// tests the behavior of the skill's AMAZON.HelpIntent
		describe("AMAZON.HelpIntent into GetNewFactIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("AMAZON.HelpIntent"), says: alexaTest.t("HELP_MESSAGE"), shouldEndSession: false },
				{
					request: alexaTest.getIntentRequest("GetNewFactIntent"), shouldEndSession: true,
					saysCallback: assertIfNotFact
				}
			]);
		});
		describe("AMAZON.HelpIntent into AMAZON.CancelIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("AMAZON.HelpIntent"), says: alexaTest.t("HELP_MESSAGE"), shouldEndSession: false },
				{ request: alexaTest.getIntentRequest("AMAZON.CancelIntent"), says: alexaTest.t("STOP_MESSAGE"), shouldEndSession: true }
			]);
		});
		describe("AMAZON.HelpIntent into AMAZON.StopIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("AMAZON.HelpIntent"), says: alexaTest.t("HELP_MESSAGE"), shouldEndSession: false },
				{ request: alexaTest.getIntentRequest("AMAZON.StopIntent"), says: alexaTest.t("STOP_MESSAGE"), shouldEndSession: true }
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
		describe("AMAZON.StopIntent", function()
		{
			alexaTest.test([
				{ request: alexaTest.getIntentRequest("AMAZON.StopIntent"), says: alexaTest.t("STOP_MESSAGE"), shouldEndSession: true }
			]);
		});
	});
}