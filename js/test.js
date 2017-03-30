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
		intentsScore = intentsFound.length;
	}
	if (entitiesToFind.length !== 0) {
		entitiesScore = entitiesFound.length / entitiesToFind.length;
	} else {
		entitiesScore = entitiesFound.length;
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
	return new Promise(
			function(resolve, reject) {
				witAi
						.messageMeaning(query)
						.then(
								function(witResponse) {
									var resolvedQuery = witResponse._text;
									var intentsFound = [];
									var entitiesFound = [];
									var entities = witResponse.entities;
									for ( var entityKey in entities) {
										if (entities.hasOwnProperty(entityKey)) {
											if (intentsToFind
													.indexOf(entityKey) === -1) {
												var entity = {};
												entity[entityKey] = entities[entityKey][0].value;
												entitiesFound.push(entity);

											} else {
												intentsFound.push(entityKey);
											}
										}
									}
									resolve(scoreLogic('WIT', query,
											resolvedQuery, intentsToFind,
											intentsFound, entitiesToFind,
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
							intentsFound.push(intents[index].intent);
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
			var result = results[index];
			var row = util.format('%s;%s;%s;%s\n', result.service,
					result.resolvedQuery, result.intentsScore,
					result.entitiesScore);
			stream.write(row);

		}
		stream.end();
	});
}

function test() {
	var queriesPromises = [];
	for (var index = 0; index < queries.length; ++index) {
		queriesPromises.push(getApiScore(queries[index].query,
				queries[index].intents, queries[index].entities));
		queriesPromises.push(getWitScore(queries[index].query,
				queries[index].intents, queries[index].entities));
		queriesPromises.push(getLuisScore(queries[index].query,
				queries[index].intents, queries[index].entities));
	}
	Promise.all(queriesPromises).then(function(results) {
		saveResults(results);
	}, function(error) {
		console.log(error);
	});
}

test();