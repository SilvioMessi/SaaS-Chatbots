var Promise = require('bluebird');
var msChatbot = require('./ms_chatbot.js')
var witAi = require('./wit_ai.js');
var apiAi = require('./api_ai.js');
var luis = require('./luis.js')
var genericEntities = require('../training_data/entities.json');
var genericIntents = require('../training_data/intents.json');

function deleteAllElements() {
	return new Promise(function(resolve, reject) {
		msChatbot.deleteAllElements(true).then(function(result) {
			console.log('MS CHATBOT intents deleted!');
			return msChatbot.deleteAllElements();
		}, function(error) {
			reject(error);
		}).then(function(result) {
			console.log('MS CHATBOT entities deleted!');
			return apiAi.deleteAllElements(true);
		}, function(error) {
			reject(error);
		}).then(function(result) {
			console.log('API intents deleted!');
			return apiAi.deleteAllElements(false);
		}, function(error) {
			reject(error);
		}).then(function(result) {
			console.log('API entities deleted!');
			return witAi.deleteAllElements();
		}, function(error) {
			// sometimes, in this point of the chain, API response with status
			// 400
			console.log('API.AI problems. Please try again!');
			// TODO : better way to break the chain
			process.exit();
		}).then(function(result) {
			console.log('WIT intents & entities deleted!');
			return luis.deleteAllElements('intent');
		}, function(error) {
			reject(error);
		}).then(function(result) {
			console.log('LUIS intents deleted!');
			return luis.deleteAllElements('entity');
		}, function(error) {
			reject(error);
		}).then(function(result) {
			console.log('LUIS entities deleted!');
			return luis.deleteAllElements('prebuiltEntity');
		}, function(error) {
			reject(error);
		}).then(function(result) {
			console.log('LUIS prebuilt entities deleted!');
			resolve();
		});
	});
}

function trainingEntities() {
	return new Promise(function(resolve, reject) {
		Promise.map(genericEntities, function(genericEntity) {
			var newEntitiesPromises = [];
			var msChatbotEntity = msChatbot.createEntity(genericEntity);
			newEntitiesPromises.push(msChatbot.newElement(msChatbotEntity));
			var apiAiEntity = apiAi.createEntity(genericEntity);
			newEntitiesPromises.push(apiAi.newElement(apiAiEntity));
			var witAiEntity = witAi.createEntity(genericEntity);
			newEntitiesPromises.push(witAi.newElement(witAiEntity));
			var luisEntity = luis.createEntity(genericEntity);
			newEntitiesPromises.push(luis.newElement(luisEntity));
			return Promise.all(newEntitiesPromises).delay(600);
		}, {
			concurrency : 1
		}).then(function(result) {
			luis.createPrebuiltEntities().then(function(result) {
				resolve(result);
			}, function(error) {
				reject(error);
			});
		});
	});
}

function trainingIntents() {
	return new Promise(function(resolve, reject) {
		Promise.map(genericIntents, function(genericIntent) {
			var newIntentsPromises = [];
			var msChatbotIntent = msChatbot.createIntent(genericIntent);
			newIntentsPromises.push(msChatbot.newElement(msChatbotIntent, true));
			var apiAiIntent = apiAi.createIntent(genericIntent);
			newIntentsPromises.push(apiAi.newElement(apiAiIntent, true));
			var witAiIntent = witAi.createIntent(genericIntent);
			newIntentsPromises.push(witAi.newElement(witAiIntent));
			var luisIntent = luis.createIntent(genericIntent);
			newIntentsPromises.push(luis.newElement(luisIntent, true));
			return Promise.all(newIntentsPromises).delay(600);
		}, {
			concurrency : 1
		}).then(function(result) {
			resolve(result);
		}, function(error) {
			reject(error);
		});
	});
}

function trainingExamples() {
	return new Promise(function(resolve, reject) {
		Promise.map(genericIntents, function(genericIntent) {
			var examples = luis.createExamples(genericIntent);
			return luis.newExamples(examples);
		}, {
			concurrency : 1
		}).then(function(response) {
			resolve(response);
		}, function(error) {
			reject(error);
		});
	});
}

function training() {
	deleteAllElements().then(function(result) {
		return trainingEntities();
	}, function(error) {
		console.log(error);
	}).then(function(result) {
		console.log('entities trained!');
		return trainingIntents();
	}, function(error) {
		console.log(error);
	}).then(function(result) {
		console.log('intents trained!');
		return trainingExamples();
	}, function(error) {
		console.log(error);
	}).then(function(result) {
		console.log('examples trained!');
	}, function(error) {
		console.log(error);
	});
}

training();