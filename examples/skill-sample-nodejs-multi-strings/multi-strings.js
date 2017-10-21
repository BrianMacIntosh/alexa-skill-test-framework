const Alexa = require("alexa-sdk");

exports.handler = (event, context, callback) => {
	'use strict';
	let alexa = Alexa.handler(event, context, callback);
	alexa.registerHandlers(handlers);
	alexa.execute();
};

const handlers = {
	'LaunchRequest': function () {
		'use strict';
		this.emit('SayHello');
	},
	'HelloWorldIntent': function () {
		'use strict';
		this.emit('SayHello');
	},
	'SayHello': function () {
		'use strict';
		let speech = ['Hello, how are you?', 'Hi, what\'s up?', 'Good day, how are you doing?'];
		let reprompt = ['How are you?', 'How do you feel?'];
		this.emit(':ask', speech[Math.floor(Math.random() * speech.length)], reprompt[Math.floor(Math.random() * reprompt.length)]);
	}
};
