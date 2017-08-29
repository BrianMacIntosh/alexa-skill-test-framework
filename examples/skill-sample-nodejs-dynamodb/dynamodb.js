const Alexa = require("alexa-sdk");

exports.handler = (event, context, callback) => {
	'use strict';
	
	let alexa = Alexa.handler(event, context, callback);
	alexa.registerHandlers(handlers);
	alexa.dynamoDBTableName = 'TestTable';
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
		this.attributes['foo'] = 'bar';
		this.emit(':tell', 'Hello World!');
	},
	'SayGoodbye': function () {
		'use strict';
		this.emit(':tell', `Bye ${this.attributes.foo}!`);
	}
};
