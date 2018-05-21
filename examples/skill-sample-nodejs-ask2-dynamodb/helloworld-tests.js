/*
Mocha tests for the Alexa skill "Hello World" example for SDK v2
Using the Alexa Skill Test Framework (https://github.com/BrianMacIntosh/alexa-skill-test-framework).

Run with 'mocha examples/skill-sample-nodejs-ask2/helloworld-tests.js'.
*/

// include the testing framework
//const alexaTest = require('alexa-skill-test-framework');
const alexaTest = require('../../index');
alexaTest.setDynamoDBTable('TestTable', 'userId', 'mapAttr');

// initialize the testing framework
alexaTest.initialize(
	require('./helloworld.js'),
	"amzn1.ask.skill.00000000-0000-0000-0000-000000000000",
	"amzn1.ask.account.VOID");

describe("Hello World Skill DynamoDB", function () {
	
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
				storesAttributes: {
					foo: 'bar'
				}
			}
		]);
	});
	
	// tests the behavior of the skill's HelloWorldIntent using validation function
	describe("HelloWorldIntent", () => {
		alexaTest.test([
			{
				request: alexaTest.getIntentRequest("HelloWorldIntent"),
				says: "Hello World!", repromptsNothing: true, shouldEndSession: true,
				storesAttributes: {
					foo: value => {return value === 'bar';}
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
