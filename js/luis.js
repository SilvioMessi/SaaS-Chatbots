var config = require('./config');
var Promise = require('bluebird');
var request = require('request');

var API_BASE_URL = 'https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/{appId}/versions/{versionId}/';
var MESSAGE_MEANING_ENDPOINT = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/{appId}';
var VERSION_ID = '0.1';
var APP_ID = config.luis.AppId;
var AUTH_HEADER = {
	'Ocp-Apim-Subscription-Key' : config.luis.SubscriptionKey,
	'Content-Type' : 'application/json'
};
var ENTITIES_ENDPOINT = 'entities';
var INTENTS_ENDPOINT = 'intents';
var EXAMPLES_ENDPOINT = 'example';
var TRAIN_ENDPOINT = 'train';

function getElements(intent) {
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

function deleteElement(elementId, intent) {
	return new Promise(function (resolve, reject){
		var url = API_BASE_URL + ENTITIES_ENDPOINT;
		if (intent){
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

function deleteAllElements(intent){
	return new Promise(function (resolve, reject){
		getElements(intent).then(function(elements) {
			var deleteElementsPromises = [];
			for (var index=0; index < elements.length; index++){
				deleteElementsPromises.push(deleteElement(elements[index].id, intent));
			}
			Promise.all(deleteElementsPromises).
			then(function(response){resolve(response);}, 
					function(error){reject(error);});
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
				entityLabels.push({
					'entityName' : entry.value[index_value].entity,
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
		var newExamplesPromises = [];
		for (var index = 0; index < examples.length; ++index) {
			newExamplesPromises.push(newExample(examples[index]));
		}
		Promise.all(newExamplesPromises).then(function(response) {
			resolve(response);
		}, function(error) {
			reject(error);
		});
	});
}

function trainApp() {
	return new Promise(function(resolve, reject) {
		var url = API_BASE_URL + TRAIN_ENDPOINT;
		url = url.replace('{appId}', APP_ID);
		url = url.replace('{versionId}', VERSION_ID);
		var requestOptions = {
			url : url,
			headers : AUTH_HEADER,
		};
		request.post(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 202) {
				resolve();
			} else {
				reject(body);
			}
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
	newExamples : newExamples,
	trainApp : trainApp,
	messageMeaning : messageMeaning
};