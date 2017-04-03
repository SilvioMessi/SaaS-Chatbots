var Promise = require('bluebird');
var fs = require('fs');
var util = require('util');
var witAi = require('./wit_ai.js');
var apiAi = require('./api_ai.js');
var luis = require('./luis.js');
var queries = require('../test_data/queries.json');

function scoreLogic(service, queryProvided, resolvedQuery, intentsToFind,
		intentsFound, entitiesToFind, entitiesFound) {
	var intentsScore = 0;
	var entitiesScore = 0;
	if (intentsToFind.length !== 0) {
		intentsScore = intentsFound.length / intentsToFind.length;
	} else {
		intentsScore = 1 + intentsFound.length;
	}
	if (entitiesToFind.length !== 0) {
		entitiesScore = entitiesFound.length / entitiesToFind.length;
	} else {
		entitiesScore = 1 + entitiesFound.length;
	}
	return {
		'service' : service,
		'queryProvided' : queryProvided,
		'resolvedQuery' : resolvedQuery,
		'intentsToFind' : intentsToFind,
		'intentsFound' : intentsFound,
		'intentsScore' : intentsScore,
		'entitiesToFind' : entitiesToFind,
		'entitiesFound' : entitiesFound,
		'entitiesScore' : entitiesScore
	};
}

function getApiScore(query, intentsToFind, entitiesToFind) {
	return new Promise(function(resolve, reject) {
		apiAi.messageMeaning(query).then(
				function(apiResponse) {
					var resolvedQuery = apiResponse.result.resolvedQuery;
					var intentsFound = [];
					var entitiesFound = [];
					var entities = apiResponse.result.parameters;
					for ( var entityKey in entities) {
						if (entities.hasOwnProperty(entityKey)) {
							var entity = {};
							// API return all parameters, not the entities found
							if (entities[entityKey] !== '') {
								entity[entityKey] = entities[entityKey];
								entitiesFound.push(entity);
							}
						}
					}
					// TODO: it's possible retrieve more than
					// one intent?
					if (apiResponse.result.metadata.intentName !== undefined) {
						intentsFound
								.push(apiResponse.result.metadata.intentName);
					}
					resolve(scoreLogic('API', query, resolvedQuery,
							intentsToFind, intentsFound, entitiesToFind,
							entitiesFound));
				}, function(error) {
					reject(error);
				});
	});
}

function getWitScore(query, intentsToFind, entitiesToFind) {
	return new Promise(function(resolve, reject) {
		witAi.messageMeaning(query).then(
				function(witResponse) {
					var resolvedQuery = witResponse._text;
					var intentsFound = [];
					var entitiesFound = [];
					var entities = witResponse.entities;
					for ( var entityKey in entities) {
						if (entities.hasOwnProperty(entityKey)) {
							// check if WIT entity is a intent
							if (intentsToFind.indexOf(entityKey) === -1) {
								var entity = {};
								var tmp = entities[entityKey][0];
								if (tmp.hasOwnProperty('value')) {
									entity[entityKey] = tmp.value;
								} else if (tmp.hasOwnProperty('values')) {
									entity[entityKey] = tmp.values;
								}
								entitiesFound.push(entity);
							} else {
								intentsFound.push(entityKey);
							}
						}
					}
					resolve(scoreLogic('WIT', query, resolvedQuery,
							intentsToFind, intentsFound, entitiesToFind,
							entitiesFound));
				}, function(error) {
					reject(error);
				});
	});
}

function getLuisScore(query, intentsToFind, entitiesToFind) {
	return new Promise(function(resolve, reject) {
		luis.messageMeaning(query).then(
				function(luisResponse) {
					var resolvedQuery = luisResponse.query;
					var intentsFound = [];
					var entitiesFound = [];
					var entities = luisResponse.entities;
					for (var index = 0; index < entities.length; ++index) {
						var entity = {};
						entity[entities[index].type] = entities[index].entity;
						entitiesFound.push(entity);
					}
					var intents = luisResponse.intents;
					for (index = 0; index < intents.length; ++index) {
						if (intents[index].intent !== 'None') {
							if (intents[index].score > 0.2) {
								intentsFound.push(intents[index].intent);
							}
						}
					}
					resolve(scoreLogic('LUIS', query, resolvedQuery,
							intentsToFind, intentsFound, entitiesToFind,
							entitiesFound));
				}, function(error) {
					reject(error);
				});
	});
}

function saveResults(results) {
	fs.writeFile('../results.json', JSON.stringify(results, null, 4), 'utf8');
	var stream = fs.createWriteStream('../results.csv');
	stream.once('open', function(fd) {
		stream.write('SERVICE;QUERY;INTENTS_SCORE;ENTITIES_SCORE\n');
		for (var index = 0; index < results.length; ++index) {
			var services = results[index];
			for (var indexTwo = 0; indexTwo < services.length; ++indexTwo) {
				var service = services[indexTwo];
				var row = util.format('%s;%s;%s;%s\n', service.service,
						service.resolvedQuery, service.intentsScore,
						service.entitiesScore);
				stream.write(row);
			}
		}
		stream.end();
	});
}

function test() {
	return new Promise(function(resolve, reject) {
		Promise.map(
				queries,
				function(query) {
					var queriesPromises = [];
					queriesPromises.push(getApiScore(query.query,
							query.intents, query.entities));
					queriesPromises.push(getWitScore(query.query,
							query.intents, query.entities));
					queriesPromises.push(getLuisScore(query.query,
							query.intents, query.entities));
					return Promise.all(queriesPromises).delay(500);
				}, {
					concurrency : 1
				}).then(function(results) {
			saveResults(results);
		}, function(error) {
			reject(error);
		});
	});
}

test();