
//Retrieved from https://github.com/alexa/skill-sample-nodejs-hello-world/blob/master/src/index.js

'use strict';
var Alexa = require("alexa-sdk");

exports.handler = function(event, context, callback) {
	var alexa = Alexa.handler(event, context, callback);
	alexa.registerHandlers(handlers);
	alexa.execute();
};

var handlers = {
	'LaunchRequest': function () {
		this.emit('SayHello');
	},
	'HelloWorldIntent': function () {
		this.emit('SayHello');
	},
	'SayHello': function () {
		this.emit(':tell', 'Hello World!');
	}
};
