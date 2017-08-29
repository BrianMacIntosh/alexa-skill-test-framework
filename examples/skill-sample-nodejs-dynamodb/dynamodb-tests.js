/*
Run with 'mocha examples/skill-sample-nodejs-hello-world/helloworld-tests.js'.
*/

// include the testing framework
//const alexaTest = require('alexa-skill-test-framework');
const alexaTest = require('../../index');

// initialize the testing framework
alexaTest.initialize(
	require('./dynamodb.js'),
	"amzn1.ask.skill.00000000-0000-0000-0000-000000000000",
	"amzn1.ask.account.VOID");

alexaTest.setDynamoDBTable('TestTable');

describe("DynamoDB Skill", () => {
	'use strict';
	
	// tests the behavior of the skill's LaunchRequest
	describe("LaunchRequest", () => {
		alexaTest.test([
			{
				request: alexaTest.getLaunchRequest(),
				says: "Hello World!", repromptsNothing: true, shouldEndSession: true
			}
		]);
	});
	
	// tests the behavior of the skill's HelloWorldIntent
	describe("HelloWorldIntent", () => {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest("HelloWorldIntent"),
				says: "Hello World!", repromptsNothing: true, shouldEndSession: true,
				hasAttributes: {
					foo: 'bar'
				},
				storesAttributes: {
					foo: 'bar'
				}
			}
		]);
	});
	
	// tests the behavior of the skill's HelloWorldIntent
	describe("SayGoodbye", () => {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest("SayGoodbye"),
				says: "Bye bar!", shouldEndSession: true,
				withStoredAttributes: {
					foo: 'bar'
				}
			}
		]);
	});
});
