var Promise = require("bluebird");
var witAi = require('./wit_ai.js');
var apiAi = require('./api_ai.js');
var queries = require('../test_data/queries.json');

function getApiScore(query, intentsToFind, entitiesToFind) {
	return new Promise(function(resolve, reject) {
		apiAi.messageMeaning(query).then(function(apiResponse) {
			var resolvedQuery = apiResponse.result.resolvedQuery;
			var intentsFound = [];
			var entitiesFound = [];
			var entities = apiResponse.result.parameters;
			for ( var entityKey in entities) {
				if (entities.hasOwnProperty(entityKey)) {
					var entity = {};
					entity[entityKey] = entities[entityKey][0];
					entitiesFound.push(entity);
				}
			}
			// TODO: it's possible retrieve more than
			// one intent?
			if (apiResponse.result.metadata.intentName !== undefined) {
				intentsFound.push(apiResponse.result.metadata.intentName);
			}
			resolve({
				'service' : 'API',
				'queryProvided' : query,
				'resolvedQuery' : resolvedQuery,
				'intentsToFind' : intentsToFind,
				'intentsFound' : intentsFound,
				'entitiesToFind' : entitiesToFind,
				'entitiesFound' : entitiesFound,
			});
		}, function(error) {
			reject(error);
		});
	});
}

function getWitScore(query, intentsToFind, entitiesToFind) {
	return new Promise(function(resolve, reject) {
		witAi.messageMeaning(query).then(function(witResponse) {
			var resolvedQuery = witResponse._text;
			var intentsFound = [];
			var entitiesFound = [];
			var entities = witResponse.entities;
			for ( var entityKey in entities) {
				if (entities.hasOwnProperty(entityKey)) {
					if (intentsToFind.indexOf(entityKey) === -1) {
						var entity = {};
						entity[entityKey] = entities[entityKey][0].value;
						entitiesFound.push(entity);

					} else {
						intentsFound.push(entityKey);
					}
				}
			}
			resolve({
				'service' : 'WIT',
				'queryProvided' : query,
				'resolvedQuery' : resolvedQuery,
				'intentsToFind' : intentsToFind,
				'intentsFound' : intentsFound,
				'entitiesToFind' : entitiesToFind,
				'entitiesFound' : entitiesFound,
			});
		}, function(error) {
			reject(error);
		});
	});
}

function test() {
	var queriesPromises = [];
	for (var index = 0; index < queries.length; ++index) {
		queriesPromises.push(getApiScore(queries[index].query,
				queries[index].intents, queries[index].entities));
		queriesPromises.push(getWitScore(queries[index].query,
				queries[index].intents, queries[index].entities));
	}
	Promise.all(queriesPromises).then(function(response) {
		console.log(JSON.stringify(response, null, 4));
	}, function(error) {
		console.log(error);
	});
}

test();