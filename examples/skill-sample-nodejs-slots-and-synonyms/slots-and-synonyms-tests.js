'use strict';

/*
 Mocha tests for a sample City Facts Alexa skill, which shows slot and synonym resolution
 Code provided by https://github.com/eemmzz
 Using the Alexa Skill Test Framework (https://github.com/BrianMacIntosh/alexa-skill-test-framework).

 Run with 'mocha examples/skill-sample-nodejs-slots-and-synonyms/slots-and-synonyms-tests.js'.
 */

// Include the testing framework
//const alexaTest = require('alexa-skill-test-framework');
const alexaTest = require('../../index');

// Initialise the testing framework
alexaTest.initialize(
	require('./slots-and-synonyms.js'),
	'amzn1.ask.skill.00000000-0000-0000-0000-000000000000',
	'amzn1.ask.account.VOID'
);

const EXPECTED_HELP_TEXT = 'Hello! You can ask for a fact about a US City. For example you can ask "Tell me about Las Vegas". Which city would you like to hear about?';
const EXPECTED_CANCEL_TEXT = 'Ok, goodbye!';
const CITY_FACTS_DIALOGUE = require('./facts.js');

describe('Slots and synonyms example skill tests', function () {
	// tests the behavior of the skill's LaunchRequest
	describe('LaunchRequest', function () {
		alexaTest.test([
			{
				request: alexaTest.getLaunchRequest(),
				says: EXPECTED_HELP_TEXT, repromptsNothing: false, shouldEndSession: false
			}
		]);
	});

	// tests the behavior of the skill's AMAZON.HelpIntent
	describe('AMAZON.HelpIntent', function () {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest('AMAZON.HelpIntent'),
				says: EXPECTED_HELP_TEXT, repromptsNothing: false, shouldEndSession: false
			}
		]);
	});

	// tests the behavior of the skill's AMAZON.HelpIntent followed by the skill's AMAZON.CancelIntent
	describe('AMAZON.HelpIntent into AMAZON.CancelIntent', function () {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest('AMAZON.HelpIntent'),
				says: EXPECTED_HELP_TEXT, repromptsNothing: false, shouldEndSession: false
			},
			{
				request: alexaTest.getIntentRequest('AMAZON.CancelIntent'),
				says: EXPECTED_CANCEL_TEXT, shouldEndSession: true, repromptsNothing: true
			}
		]);
	});

	// tests the behavior of the skill's AMAZON.HelpIntent followed by the skill's AMAZON.StopIntent
	describe('AMAZON.HelpIntent into AMAZON.StopIntent', function () {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest('AMAZON.HelpIntent'),
				says: EXPECTED_HELP_TEXT, repromptsNothing: false, shouldEndSession: false
			},
			{
				request: alexaTest.getIntentRequest('AMAZON.StopIntent'),
				says: EXPECTED_CANCEL_TEXT, shouldEndSession: true, repromptsNothing: true
			}
		]);
	});

	// tests the behavior of the skill's AMAZON.StopIntent
	describe('AMAZON.StopIntent', function () {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest('AMAZON.StopIntent'),
				says: EXPECTED_CANCEL_TEXT, shouldEndSession: true, repromptsNothing: true
			}
		]);
	});

	// tests the behavior of the skill's AMAZON.CancelIntent
	describe('AMAZON.CancelIntent', function () {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest('AMAZON.CancelIntent'),
				says: EXPECTED_CANCEL_TEXT, shouldEndSession: true, repromptsNothing: true
			}
		]);
	});

	// tests the behavior of the skill's CityFactIntent
	describe('CityFactIntent', function () {
		const slot = {'City': 'New York'};
		const requestWithSlot = alexaTest.getIntentRequest('CityFactIntent', slot);

		function assertResponseText(context, response) {
			const outputSpeech = response.response.outputSpeech.ssml.replace('<speak>', '').replace('</speak>', '');
			console.log(outputSpeech);

			if (CITY_FACTS_DIALOGUE['new york'].indexOf(outputSpeech.trim()) < 0) {
				context.assert({message: 'Expected dialogue to contain a fact about New York'});
			}
		}

		alexaTest.test([
			{
				request: requestWithSlot,
				callback: assertResponseText, shouldEndSession: true, repromptsNothing: true
			}
		]);
	});

	// tests the behavior of the skill's CityFactIntent with synonyms
	describe('CityFactIntent with synonyms', function () {
		const slotWithSynonym = {'City': 'The big apple'};
		const requestWithEntityResolution = alexaTest.addEntityResolutionToRequest(
			alexaTest.getIntentRequest('CityFactIntent', slotWithSynonym),
			'City',
			'CITY_NAMES',
			'New York',
			'id'
		);

		function assertResponseText(context, response) {
			const outputSpeech = response.response.outputSpeech.ssml.replace('<speak>', '').replace('</speak>', '');
			console.log(outputSpeech);

			if (CITY_FACTS_DIALOGUE['new york'].indexOf(outputSpeech.trim()) < 0) {
				context.assert({message: 'Expected dialogue to contain a fact about New York'});
			}
		}

		alexaTest.test([
			{
				request: requestWithEntityResolution,
				callback: assertResponseText, shouldEndSession: true, repromptsNothing: true
			}
		]);
	});
});
