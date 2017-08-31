// include the testing framework
//const alexaTest = require('alexa-skill-test-framework');
const alexaTest = require('../../index');

// initialize the testing framework
alexaTest.initialize(
	require('./audioplayer.js'),
	"amzn1.ask.skill.00000000-0000-0000-0000-000000000000",
	"amzn1.ask.account.VOID");

describe("Audio Player Skill", () => {
	'use strict';
	
	describe("LaunchRequest", () => {
		alexaTest.test([
			{
				request: alexaTest.getLaunchRequest(),
				says: "Hello World!", repromptsNothing: true, shouldEndSession: true
			}
		]);
	});
	
	describe("PlayStreamIntent", () => {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest("PlayStreamIntent"),
				playsStream: {
					behavior: 'REPLACE_ALL',
					url: 'https://superAudio.stream',
					token: 'superToken'
				}
			}
		]);
	});
	
	describe("ClearQueueIntent", () => {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest("ClearQueueIntent"),
				clearsQueue: 'CLEAR_ALL'
			}
		]);
	});
	
	describe("AMAZON.ResumeIntent", () => {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest("AMAZON.ResumeIntent"),
				playsStream: {
					behavior: 'REPLACE_ALL',
					url: 'https://superAudio.stream',
					token: 'superToken',
					offset: 0
				}
			}
		]);
	});
	
	describe("AMAZON.ResumeIntent at position", () => {
		alexaTest.test([
			{
				request: alexaTest.addAudioPlayerContextToRequest(alexaTest.getIntentRequest("AMAZON.ResumeIntent"), 'superToken', 123),
				playsStream: {
					behavior: 'REPLACE_ALL',
					url: 'https://superAudio.stream',
					token: 'superToken',
					offset: 123
				}
			}
		]);
	});
	
	describe("AMAZON.PauseIntent", () => {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest("AMAZON.PauseIntent"),
				stopsStream: true
			}
		]);
	});
});
