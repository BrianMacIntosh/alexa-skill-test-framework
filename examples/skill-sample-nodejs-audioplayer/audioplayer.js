const Alexa = require("alexa-sdk");

exports.handler = (event, context, callback) => {
	'use strict';
	
	var alexa = Alexa.handler(event, context, callback);
	alexa.registerHandlers(handlers);
	alexa.execute();
};

const handlers = {
	'LaunchRequest': function () {
		'use strict';
		this.emit(':tell', 'Hello World!');
	},
	'PlayStreamIntent': function () {
		'use strict';
		this.response.audioPlayerPlay('REPLACE_ALL', 'https://superAudio.stream', 'superToken', null, 0);
		this.emit(':responseReady');
	},
	'ClearQueueIntent': function () {
		'use strict';
		this.response.audioPlayerClearQueue('CLEAR_ALL');
		this.emit(':responseReady');
	},
	'AMAZON.PauseIntent': function () {
		'use strict';
		this.response.audioPlayerStop();
		this.emit(':responseReady');
	},
	'AMAZON.ResumeIntent': function () {
		'use strict';
		let offset = this.event.context.AudioPlayer.offsetInMilliseconds || 0;
		this.response.audioPlayerPlay('REPLACE_ALL', 'https://superAudio.stream', 'superToken', 'superToken', offset);
		this.emit(':responseReady');
	},
	'AMAZON.StopIntent': function () {
		'use strict';
		this.response.audioPlayerStop();
		this.emit(':responseReady');
	},
	'AMAZON.CancelIntent': function () {
		'use strict';
		this.response.audioPlayerStop();
		this.emit(':responseReady');
	},
};
