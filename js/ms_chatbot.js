var config = require('./config');
var Promise = require('bluebird');
var request = require('request');
var prebuiltEntities = require('./prebuilt_entities');

var API_BASE_URL = 'http://localhost:8000/api/';
var HEADER = {
	'Content-Type' : 'application/json; charset=utf-8'
};
var MESSAGE_MEANING_ENDPOINT = 'query';
var ENTITIES_ENDPOINT = 'entities';
var INTENTS_ENDPOINT = 'intents';

function getElements(intent) {
	return new Promise(function(resolve, reject) {
		var url = API_BASE_URL + ENTITIES_ENDPOINT + '/pagoff/';
		if (intent){
			url = API_BASE_URL + INTENTS_ENDPOINT + '/pagoff/';
		}
		var requestOptions = {
				url : url,
				headers : HEADER
		};
		request(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			} else {
				reject('MS CHATBOT get elements:' + body);
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
		url = url +'/' + elementId;
		var requestOptions = {
			url : url,
			headers : HEADER
		};
		request.delete(requestOptions, function(error, response, body){
			if (!error && response.statusCode === 204) {
				resolve();
			}
			else{
				reject('MS CHATBOT delete element:' + body);
			}
		});
	});
}

function deleteAllElements(intent){
	return new Promise(function (resolve, reject){
		getElements(intent).then(function(elements) {
			Promise.map(elements, function(element) {
				return deleteElement(element.id, intent).delay(100);
			}, {
				concurrency : 1
			}).then(function(result) {
				resolve(result);
			}, function(error) {
				reject('MS CHATBOT delete all elements:' + error);
			});
		});
	});
}

function createEntity(genericEntity) {
	tmp = JSON.parse(JSON.stringify(genericEntity));
	tmp.name = tmp.id;
	delete tmp.id;
	tmp.values = tmp.entries;
	delete tmp.entries;
	return tmp;
}

function createIntent(genericIntent) {
	tmp = JSON.parse(JSON.stringify(genericIntent));
	tmp.name = tmp.id;
	delete tmp.id;
	return tmp;
}

function newElement(element, intent) {
	return new Promise(function(resolve, reject) {
		var url = API_BASE_URL + ENTITIES_ENDPOINT + '/';
		if (intent){
			url = API_BASE_URL + INTENTS_ENDPOINT + '/';
		}
		var requestOptions = {
			url : url,
			headers : HEADER,
			body : JSON.stringify(element)
		};
		request.post(requestOptions, function(error, response, body) {
			if (!error && response.statusCode === 201) {
				resolve(JSON.parse(body));
			} else {
				reject('MS CHATBOT new element:' + body);
			}
		});
	});
}

function messageMeaning(query) {
	return new Promise(function (resolve, reject){
		var url = API_BASE_URL + MESSAGE_MEANING_ENDPOINT;
		var queryParameters = {
			query : query,
		};
		var requestOptions = {
			url :url ,
			qs : queryParameters
		};
		request(requestOptions,function(error, response, body){
			if (!error && response.statusCode === 200) {
				resolve(JSON.parse(body));
			}
			else{
				reject('MS CHATBOT message meaning:' + body);
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
	messageMeaning : messageMeaning
};