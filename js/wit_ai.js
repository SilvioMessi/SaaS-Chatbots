var config = require('./config');
var Promise = require('bluebird');
var request = require('request');

var API_BASE_URL = 'https://api.wit.ai/';
var AUTH_AND_VERSION_HEADERS = {
	'Authorization' : 'Bearer ' + config.witAi.ServerAccessToken,
	'Accept' : 'application/vnd.wit.20170308+json',
	'Content-Type' : 'application/json'
};
var ENTITIES_ENDPOINT = 'entities';
var CONVERSE_ENDPOINT = 'converse';
var MESSAGE_MEANING_ENDPOINT = 'message';

function getElements() {
	return new Promise(function(resolve, reject) {
		var requestOptions = {
			url : API_BASE_URL + ENTITIES_ENDPOINT,
			headers : AUTH_AND_VERSION_HEADERS
		};
		request(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			} else {
				reject('WIT get elements:' + body);
			}
		});
	});
}

function deleteElement(elementId) {
	return new Promise(function (resolve, reject){
		var requestOptions = {
				url : API_BASE_URL + ENTITIES_ENDPOINT + '/' + elementId,
				headers : AUTH_AND_VERSION_HEADERS
			};
		request.delete(requestOptions, function(error, response, body){
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			}
			else{
				reject('WIT delete element:' + body);
			}
		});
	});
}

function deleteAllElements(intent){
	return new Promise(function (resolve, reject){
		getElements().then(function(elements) {
			Promise.map(elements, function(element) {
				if (element.startsWith("wit$") === false){
					return deleteElement(element).delay(200);
				}	
			}, {
				concurrency : 1
			}).then(function(result) {
				resolve(result);
			}, function(error) {
				reject('WIT delete all elements:' + error);
			});
		});
	});
}

function createEntity(genericEntity) {
	var values = [];
	for (var index = 0; index < genericEntity.entries.length; ++index) {
		values.push({
			'value' : genericEntity.entries[index].value,
			'expressions' : genericEntity.entries[index].synonyms
		});
	}
	return {
		'doc' : genericEntity.description,
		'id' : genericEntity.id,
		'values' : values,
		'lookups' : [ 'keywords']
	};
}

function createIntent(genericIntent) {
	var values = [];
	var expressions = [];
	for (var index = 0; index < genericIntent.entries.length; ++index) {
		var entry = genericIntent.entries[index];
		var text = '';
		for (var index_value = 0; index_value < entry.value.length; ++index_value) {
			text += entry.value[index_value].text;
		}
		expressions.push(text);
	}
	values.push({
		'value' : genericIntent.id,
		'expressions' : expressions
	});
	return {
		'doc' : genericIntent.description,
		'id' : genericIntent.id,
		'values' : values,
		'lookups' : [ 'trait' ]
	};
}

function newElement(element) {
	return new Promise(function(resolve, reject) {
		var requestOptions = {
			url : API_BASE_URL + ENTITIES_ENDPOINT,
			headers : AUTH_AND_VERSION_HEADERS,
			body : JSON.stringify(element)
		};
		request.post(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			} else {
				reject('WIT new element:' + body);
			}
		});
	});
}

function messageMeaning(query) {
	return new Promise(function(resolve, reject) {
		var queryParameters = {
			q : query
		};
		var requestOptions = {
			url : API_BASE_URL + MESSAGE_MEANING_ENDPOINT,
			headers : AUTH_AND_VERSION_HEADERS,
			qs : queryParameters
		};
		request(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			} else {
				reject('WIT message meaning:' + body);
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