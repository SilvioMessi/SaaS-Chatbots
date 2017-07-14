var config = require('./config');
var Promise = require('bluebird');
var request = require('request');
var prebuiltEntities = require('./prebuilt_entities');

var API_BASE_URL = 'https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/{appId}/versions/{versionId}/';
var MESSAGE_MEANING_ENDPOINT = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/{appId}';
var VERSION_ID = '0.1';
var APP_ID = config.luis.AppId;
var AUTH_HEADER = {
	'Ocp-Apim-Subscription-Key' : config.luis.SubscriptionKey,
	'Content-Type' : 'application/json'
};
var ENTITIES_ENDPOINT = 'entities';
var PREBUILT_ENTITIES_ENDPOINT = 'prebuilts';
var INTENTS_ENDPOINT = 'intents';
var EXAMPLES_ENDPOINT = 'example';
var TRAIN_ENDPOINT = 'train';

function getElements(elementType) {
	return new Promise(function(resolve, reject) {
		var url = '';
		if (elementType === 'entity'){
			url = API_BASE_URL + ENTITIES_ENDPOINT;
		}
		else if (elementType === 'prebuiltEntity'){
			url = API_BASE_URL + PREBUILT_ENTITIES_ENDPOINT;
		}
		else if (elementType === 'intent'){
			url = API_BASE_URL + INTENTS_ENDPOINT;
		}
		url = url.replace('{appId}', APP_ID);
		url = url.replace('{versionId}', VERSION_ID);
		var requestOptions = {
			url : url,
			headers : AUTH_HEADER,
		};
		request(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			} else {
				reject(body);
			}
		});
	});
}

function deleteElement(elementId, elementType) {
	return new Promise(function (resolve, reject){
		var url = '';
		if (elementType === 'entity'){
			url = API_BASE_URL + ENTITIES_ENDPOINT;
		}
		else if (elementType === 'prebuiltEntity'){
			url = API_BASE_URL + PREBUILT_ENTITIES_ENDPOINT;
		}
		else if (elementType === 'intent'){
			url = API_BASE_URL + INTENTS_ENDPOINT;
		}
		url = url.replace('{appId}', APP_ID);
		url = url.replace('{versionId}', VERSION_ID);
		url = url +'/' + elementId;
		var requestOptions = {
			url : url,
			headers : AUTH_HEADER,
		};
		request.delete(requestOptions, function(error, response, body){
			if (!error && response.statusCode === 200) {
				resolve();
			}
			else{
				// the default intent 'None' can not be deleted
				if (JSON.parse(body).error.message === 'Can not delete None intent.'){
					resolve();
				}
				reject(body);
			}
		});
	});
}

function deleteAllElements(elementType){
	return new Promise(function (resolve, reject){
		getElements(elementType).then(function(elements) {
			Promise.map(elements, function(element) {
				return deleteElement(element.id, elementType).delay(200);
			}, {
				concurrency : 1
			}).then(function(result) {
				resolve(result);
			}, function(error) {
				reject(error);
			});
		});
	});
}

function createEntity(genericEntity) {
	return {
		'name' : genericEntity.id
	};
}

function createIntent(genericIntent) {
	return {
		'name' : genericIntent.id
	};
}

function createExamples(genericIntent) {
	var examples = [];
	for (var index = 0; index < genericIntent.entries.length; ++index) {
		var entry = genericIntent.entries[index];
		var text = '';
		var entityLabels = [];
		var length = 0;
		for (var index_value = 0; index_value < entry.value.length; ++index_value) {
			var pieceOfText = entry.value[index_value].text;
			if (entry.value[index_value].hasOwnProperty('entity')) {
				var entityName = entry.value[index_value].entity;
				if (entry.value[index_value].prebuilt){
					entityName = prebuiltEntities[entityName].LUIS;
				}
				entityLabels.push({
					'entityName' : entityName,
					'startCharIndex' : length,
					'endCharIndex' : length + pieceOfText.length
				});

			}
			text += pieceOfText;
			length += pieceOfText.length;
		}
		examples.push({
			'text' : text,
			'intentName' : genericIntent.id,
			'entityLabels' : entityLabels
		});
	}
	return examples;
}

function newElement(element, intent) {
	return new Promise(function(resolve, reject) {
		var url = API_BASE_URL + ENTITIES_ENDPOINT;
		if (intent){
			url = API_BASE_URL + INTENTS_ENDPOINT;
		}
		url = url.replace('{appId}', APP_ID);
		url = url.replace('{versionId}', VERSION_ID);
		var requestOptions = {
			url : url,
			headers : AUTH_HEADER,
			body : JSON.stringify(element)
		};
		request.post(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 201) {
				resolve(JSON.parse(body));
			} else {
				reject(body);
			}
		});
	});
}

function createPrebuiltEntities() {
	return new Promise(function(resolve, reject) {
		var prebuiltEntitiesArray = [];
		for (var entity in prebuiltEntities){
		    if (prebuiltEntities.hasOwnProperty(entity)) {
		    	prebuiltEntitiesArray.push(prebuiltEntities[entity].LUIS);
		    }
		}
		var url = API_BASE_URL + PREBUILT_ENTITIES_ENDPOINT;
		url = url.replace('{appId}', APP_ID);
		url = url.replace('{versionId}', VERSION_ID);
		var requestOptions = {
			url : url,
			headers : AUTH_HEADER,
			body : JSON.stringify(prebuiltEntitiesArray)
		};
		request.post(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 201) {
				resolve(JSON.parse(body));
			} else {
				reject(body);
			}
		});
	});
}

function newExample(example){
	return new Promise(function(resolve, reject) {
		var url = API_BASE_URL + EXAMPLES_ENDPOINT;
		url = url.replace('{appId}', APP_ID);
		url = url.replace('{versionId}', VERSION_ID);		
		var requestOptions = {
			url : url,
			headers : AUTH_HEADER,
			body : JSON.stringify(example),
		};
		request.post(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 201) {
				resolve(JSON.parse(body));
			} else {
				reject(body);
			}
		});
	});
}

function newExamples(examples) {
	return new Promise(function(resolve, reject) {
		Promise.map(examples, function(example) {
			return newExample(example).delay(400);
		}, {
			concurrency : 1
		}).then(function(response) {
			resolve(response);
		}, function(error) {
			reject(error);
		});
	});
}

function messageMeaning(query) {
	return new Promise(function (resolve, reject){
		var queryParameters = {
			q : query,
			'subscription-key' : config.luis.SubscriptionKey,
			timezoneOffset:'1.0',
			verbose:true
		};
		var url = MESSAGE_MEANING_ENDPOINT.replace('{appId}', APP_ID);
		var requestOptions = {
			url :url ,
			qs : queryParameters
		};
		request(requestOptions,function(error, response, body){
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			}
			else{
				reject(body);
			}
		});
	});
}

module.exports = {
	getElements : getElements,
	deleteElement: deleteElement,
	deleteAllElements: deleteAllElements,
	createEntity : createEntity,
	createIntent : createIntent,
	createExamples : createExamples,
	newElement : newElement,
	createPrebuiltEntities : createPrebuiltEntities,
	newExamples : newExamples,
	messageMeaning : messageMeaning
};