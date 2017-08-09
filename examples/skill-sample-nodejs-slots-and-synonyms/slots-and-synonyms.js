'use strict';

const Alexa = require('alexa-sdk');

const HELP_TEXT = 'Hello! You can ask for a fact about a US City. For example you can ask "Tell me about Las Vegas". Which city would you like to hear about?';
const CANCEL_TEXT = 'Ok, goodbye!';
const CITY_FACTS_DIALOGUE = require('./facts.js');

function resolveToCanonicalSlotValue(slot) {
	const resolutions = slot.resolutions;
	const hasResolutionDataOnSlot = (resolutions && resolutions.resolutionsPerAuthority
	&& resolutions.resolutionsPerAuthority.length > 0);
	const resolution = hasResolutionDataOnSlot ? slot.resolutions.resolutionsPerAuthority[0] : null;

	if (resolution && resolution.status.code === 'ER_SUCCESS_MATCH') {
		return resolution.values[0].value.name;
	} else {
		return slot.value;
	}
}

const handlers = {
	LaunchRequest: function () {
		this.emit(':ask', HELP_TEXT, HELP_TEXT);
	},
	'AMAZON.HelpIntent': function () {
		this.emit(':ask', HELP_TEXT, HELP_TEXT);
	},
	'AMAZON.CancelIntent': function () {
		this.emit(':tell', CANCEL_TEXT);
	},
	'AMAZON.StopIntent': function () {
		this.emit(':tell', CANCEL_TEXT);
	},
	CityFactIntent: function () {
		const requestSlotData = this.event.request.intent.slots.City;
		const citySlotValue = resolveToCanonicalSlotValue(requestSlotData).toLowerCase();

		if (CITY_FACTS_DIALOGUE[citySlotValue]) {
			const facts = CITY_FACTS_DIALOGUE[citySlotValue];
			const randomFact = facts[Math.floor(Math.random() * facts.length)];
			this.emit(':tell', randomFact);
		} else {
			this.emit(':tell', 'Sorry, I was unable to find a fact for ' + citySlotValue);
		}
	}
};

exports.handler = function(event, context, callback) {
	const alexa = Alexa.handler(event, context, callback);
	alexa.registerHandlers(handlers);
	alexa.execute();
};
