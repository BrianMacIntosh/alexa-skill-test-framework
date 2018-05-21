const Alexa = require('ask-sdk');

class SayHelloHandler {
	
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'LaunchRequest' ||
			(handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent') ||
			(handlerInput.requestEnvelope.request.type === 'IntentRequest' && handlerInput.requestEnvelope.request.intent.name === 'SayHello');
	}
	
	async handle(handlerInput) {
		const attributes = await handlerInput.attributesManager.getPersistentAttributes();
		attributes.foo = 'bar';
		handlerInput.attributesManager.setPersistentAttributes(attributes);
		await handlerInput.attributesManager.savePersistentAttributes();
		
		return handlerInput.responseBuilder.speak('Hello World!').getResponse();
	}
}

class SayGoodbyeHandler {
	
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'SayGoodbye';
	}
	
	async handle(handlerInput) {
		const attributes = await handlerInput.attributesManager.getPersistentAttributes();
		return handlerInput.responseBuilder.speak(`Bye ${attributes.foo}!`).getResponse();
	}
}

exports.handler = Alexa.SkillBuilders.custom()
	.withPersistenceAdapter(new Alexa.DynamoDbPersistenceAdapter({
		tableName: 'TestTable',
		partitionKeyName: 'userId',
		attributesName: 'mapAttr'
	}))
	.withApiClient(new Alexa.DefaultApiClient())
	.addRequestHandlers(
		new SayHelloHandler(),
		new SayGoodbyeHandler()
	)
	.lambda();
