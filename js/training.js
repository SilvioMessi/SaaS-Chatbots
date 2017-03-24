var Promise = require('bluebird');
var witAi = require('./wit_ai.js');
var apiAi = require('./api_ai.js');
var luis = require('./luis.js');
var genericEntities = require('../training_data/entities.json');
var genericIntents = require('../training_data/intents.json');

function trainingEntities() {
	return new Promise(function(resolve, reject) {
		var newEntitiesPromises = [];
		for (var index = 0; index < genericEntities.length; ++index) {
			var genericEntity = genericEntities[index];
			var apiAiEntity = apiAi.createEntity(genericEntity);
			newEntitiesPromises.push(apiAi.newElement(apiAiEntity));
			var witAiEntity = witAi.createEntity(genericEntity);
			newEntitiesPromises.push(witAi.newElement(witAiEntity));
			var luisEntity = luis.createEntity(genericEntity);
			newEntitiesPromises.push(luis.newElement(luisEntity));
		}
		Promise.all(newEntitiesPromises).then(function(response) {
			resolve(response);
		}, function(error) {
			reject(error);
		});
	});
}

function trainingIntents() {
	return new Promise(function(resolve, reject) {
		var newIntentsPromises = [];
		for (var index = 0; index < genericIntents.length; ++index) {
			var genericIntent = genericIntents[index];
			var apiAiIntent = apiAi.createIntent(genericIntent);
			newIntentsPromises.push(apiAi.newElement(apiAiIntent, true));
			var witAiIntent = witAi.createIntent(genericIntent);
			newIntentsPromises.push(witAi.newElement(witAiIntent));
			var luisIntent = luis.createIntent(genericIntent);
			newIntentsPromises.push(luis.newElement(luisIntent, true));
		}
		Promise.all(newIntentsPromises).then(function(response) {
			resolve(response);
		}, function(error) {
			reject(error);
		});
	});
}

function trainingExamples() {
	return new Promise(function(resolve, reject) {
		var newExamplesPromises = [];
		for (var index = 0; index < genericIntents.length; ++index) {
			var genericIntent = genericIntents[index];
			var examples = luis.createExamples(genericIntent);
			newExamplesPromises.push(luis.newExamples(examples));
		}
		Promise.all(newExamplesPromises).then(function(response) {
			resolve(response);
		}, function(error) {
			reject(error);
		});
	});
}

function training() {
	apiAi.deleteAllElements(true).then(function(result) {
		console.log('API intents deleted!');
		return apiAi.deleteAllElements();
	}, function(rejected) {
		console.log(rejected);
	}).then(function(result) {
		console.log('API entities deleted!');
		return witAi.deleteAllElements();
	}, function(rejected) {
		console.log(rejected);
	}).then(function(result) {
		console.log('WIT intents & entities deleted!');
		return luis.deleteAllElements(true);
	}, function(rejected) {
		console.log(rejected);
	}).then(function(result) {
		console.log('LUIS intents deleted!');
		return luis.deleteAllElements();
	}, function(rejected) {
		console.log(rejected);
	}).then(function(result) {
		console.log('LUIS entities deleted!');
		return trainingEntities();
	}, function(rejected) {
		console.log(rejected);
	}).then(function(result) {
		console.log('entities trained!');
		return trainingIntents();
	}, function(rejected) {
		console.log(rejected);
	}).then(function(result) {
		console.log('intents trained!');
		return trainingExamples();
	}, function(rejected) {
		console.log(rejected);
	}).then(function(result) {
		console.log('examples trained!');
		return luis.trainApp();
	}, function(rejected) {
		console.log(rejected);
	}).then(function(result) {
		console.log('luis app trained!');
	}, function(rejected) {
		console.log(rejected);
	});
}

training();