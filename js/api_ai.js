var config = require('./config');
var Promise = require('bluebird');
var request = require('request');
var prebuiltEntities = require('./prebuilt_entities');

var API_BASE_URL = 'https://api.api.ai/v1/';
var CLIENT_AUTH_HEADER = {
	'Authorization' : 'Bearer ' + config.apiAi.ClientAccessToken,
	'Content-Type' : 'application/json; charset=utf-8'
};
var DEVELOPER_AUTH_HEADER = {
	'Authorization' : 'Bearer' + config.apiAi.DeveloperAccessToken,
	'Content-Type' : 'application/json; charset=utf-8'
};
var VERSION = '20170308';
var MESSAGE_MEANING_ENDPOINT = 'query';
var ENTITIES_ENDPOINT = 'entities';
var INTENTS_ENDPOINT = 'intents';

function getElements(intent) {
	return new Promise(function(resolve, reject){
		var queryParameters = {
				v : VERSION,
			};
		var url = API_BASE_URL + ENTITIES_ENDPOINT;
		if (intent){
			url = API_BASE_URL + INTENTS_ENDPOINT;
		}
		var requestOptions = {
			url : url,
			headers : DEVELOPER_AUTH_HEADER,
			qs : queryParameters
		};
		request(requestOptions, function(error, response, body){
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			}
			else{
				reject(body);
			}
		});
	});
}

function deleteElement(elementId, intent) {
	return new Promise(function (resolve, reject){
		var queryParameters = {
				v : VERSION,
			};
		var url = API_BASE_URL + ENTITIES_ENDPOINT + '/' + elementId;
		if (intent){
			url = API_BASE_URL + INTENTS_ENDPOINT + '/' + elementId;
		}
		var requestOptions = {
			url : url,
			headers : DEVELOPER_AUTH_HEADER,
			qs : queryParameters
		};
		request.delete(requestOptions, function(error, response, body){
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			}
			else{
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
	var entries = [];
	for (var index = 0; index < genericEntity.entries.length; ++index) {
		entries.push({
			'value' : genericEntity.entries[index].value,
			'synonyms' : genericEntity.entries[index].synonyms
		});
	}
	return {
		'name' : genericEntity.id,
		'entries' : entries
	};
}

function createIntent(genericIntent) {
	var userSays = [];
	for (var index = 0; index < genericIntent.entries.length; ++index) {
		var entry = genericIntent.entries[index];
		var data = [];
		for (var index_value = 0; index_value < entry.value.length; ++index_value) {
			if (entry.value[index_value].hasOwnProperty('entity')) {
				var entityName = entry.value[index_value].entity;
				if (entry.value[index_value].prebuilt){
					entityName = prebuiltEntities[entityName].API;
				}
				data.push({
					'text' : entry.value[index_value].text,
					'alias' : entityName,
					'meta' : '@' + entityName
				});
			} else {
				data.push({
					'text' : entry.value[index_value].text
				});
			}
		}
		userSays.push({
			'data' : data,
			'isTemplate' : false,
			'count' : 0
		});
	}
	return {
		'name' : genericIntent.id,
		'auto' : true,
		'contexts' : [],
		'userSays' : userSays
	};
}

function newElement(element, intent) {
	return new Promise(function (resolve, reject){
		var queryParameters = {
			v : VERSION,
		};
		var url =  API_BASE_URL + ENTITIES_ENDPOINT ;
		if (intent){
			url =  API_BASE_URL + INTENTS_ENDPOINT;
		}
		var requestOptions = {
			url : url,
			headers : DEVELOPER_AUTH_HEADER,
			body : JSON.stringify(element),
			qs : queryParameters
		};
		request.post(requestOptions,  function(error, response, body){
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			}
			else{
				reject(body);
			}
		});
	});
}

function messageMeaning(query) {
	return new Promise(function (resolve, reject){
		var queryParameters = {
			q : query,
			v : VERSION,
			lang : 'en',
			sessionId : 'abc123',
		};
		var requestOptions = {
			url : API_BASE_URL + MESSAGE_MEANING_ENDPOINT,
			headers : CLIENT_AUTH_HEADER,
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
	newElement : newElement,
	messageMeaning : messageMeaning,
};