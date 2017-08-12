var Promise = require('bluebird');
var fs = require('fs');
var util = require('util');
var msChatbot = require('./ms_chatbot.js')
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

function getMsChatbotScore(query, intentsToFind, entitiesToFind) {
	return new Promise(
			function(resolve, reject) {
				msChatbot
						.messageMeaning(query)
						.then(
								function(msChatbotResponse) {
									var resolvedQuery = msChatbotResponse.query;
									var intentsFound = [];
									var entitiesFound = [];
									var entities = msChatbotResponse.sentences[0].entities_recognized;
									for (var index = 0; index < entities.length; ++index) {
										var entity = {};
										entity[entities[index].value.entity.name] = entities[index].value.value;
										entitiesFound.push(entity);
									}
									var intents = msChatbotResponse.sentences[0].intents_recognized;
									for (index = 0; index < intents.length; ++index) {
										if (intents[index].score > 0.4) {
											intentsFound
													.push(intents[index].intent);
										}
									}
									resolve(scoreLogic('MS CHATBOT', query,
											resolvedQuery, intentsToFind,
											intentsFound, entitiesToFind,
											entitiesFound));
								}, function(error) {
									reject(error);
								});
			});
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

function computeMetrics(results, serviceName) {
	var supportMatrix = {};
	var allClasses = [];
	var confusionMatrix = {};
	
	// crate support matrix
	for (var index = 0; index < results.length; ++index) {
		var services = results[index];
		for (var indexTwo = 0; indexTwo < services.length; ++indexTwo) {
			var service = services[indexTwo];
			if (service.service !== serviceName){
				continue;
			}
			var intentsToFind = service.intentsToFind;
			var _class = 'None';
			if (intentsToFind.length > 0) {
				_class = intentsToFind[0]
			}

			var intentsFound = service.intentsFound;
			var predicted = 'None';
			if (intentsFound.length > 0) {
				predicted = intentsFound[0]
			}

			if (!(_class in supportMatrix)) {
				supportMatrix[_class] = {}
				supportMatrix[_class][predicted] = 0;
				if (!(allClasses.includes(_class))) {
					allClasses.push(_class);
				}
				if (!(allClasses.includes(predicted))) {
					allClasses.push(predicted);
				}

			} else if (!(predicted in supportMatrix[_class])) {
				supportMatrix[_class][predicted] = 0;
				if (!(allClasses.includes(predicted))) {
					allClasses.push(predicted);
				}
			}
			supportMatrix[_class][predicted] += 1;
		}
	}

	// fill support matrix with 0
	for (var classId = 0; classId < allClasses.length; ++classId) {
		_class = allClasses[classId];
		for (var predictedId = 0; predictedId < allClasses.length; ++predictedId) {
			predicted = allClasses[predictedId];
			if (!(_class in supportMatrix)) {
				supportMatrix[_class] = {}
			}
			if (!(predicted in supportMatrix[_class])) {
				supportMatrix[_class][predicted] = 0;
			}
		}
	}
	
	// save support matrix
	var streamSupportMatrix = fs.createWriteStream('../support_matrix_' + serviceName + '.csv');
	streamSupportMatrix.once('open', function(fd) {
		streamSupportMatrix.write('class\\predicted;' + allClasses.join(';') + ';\n')
		for (var classId = 0; classId < allClasses.length; ++classId) {
			_class = allClasses[classId];
			var row = [ _class + ';' ];
			for (var predictedId = 0; predictedId < allClasses.length; ++predictedId) {
				predicted = allClasses[predictedId];
				row = row + supportMatrix[_class][predicted] + ';';
			}
			streamSupportMatrix.write(row + '\n');
		}
		streamSupportMatrix.end();
	});
	
	var metrics = {}
	var totTp = 0;
	var totFn = 0;
	var totFp = 0;
	var totTn = 0;
	// for each class
	for (var classId = 0; classId < allClasses.length; ++classId) {
		evaluatedClass = allClasses[classId];
		metrics[evaluatedClass] = {};
		// true positive
		var tp = supportMatrix[evaluatedClass][evaluatedClass];
		// false negative
		var fn = 0;
		// false positive
		var fp = 0;
		for (var predictedId = 0; predictedId < allClasses.length; ++predictedId) {
			predicted = allClasses[predictedId];
			if (predicted !== evaluatedClass) {
				fn += supportMatrix[evaluatedClass][predicted];
				fp += supportMatrix[predicted][evaluatedClass];
			}
		}
		// true negative
		var tn = 0;
		for (var indexOne = 0; indexOne < allClasses.length; ++indexOne) {
			_class = allClasses[indexOne];
			for (var indexTwo = 0; indexTwo < allClasses.length; ++indexTwo) {
				predicted = allClasses[indexTwo];
				if (_class !== evaluatedClass && predicted !== evaluatedClass) {
					tn += supportMatrix[_class][predicted];
				}
			}
		}
		metrics[evaluatedClass]['tp'] = tp;
		metrics[evaluatedClass]['fn'] = fn;
		metrics[evaluatedClass]['fp'] = fp;
		metrics[evaluatedClass]['tn'] = tn;
		totTp += tp;
		totFn += fn;
		totFp += fp;
		totTn += tn;
		
	}
	
	totTp = totTp/allClasses.length;
	totFn = totFn/allClasses.length;
	totFp = totFp/allClasses.length;
	totTn = totTn/allClasses.length;
	metrics['totTp'] = totTp;
	metrics['totFn'] = totFn;
	metrics['totFp'] = totFp;
	metrics['totTn'] = totTn;
	
	// save metrics
	var streamMetrics = fs.createWriteStream('../metrics_' + serviceName + '.csv');
	streamMetrics.once('open', function(fd) {
		streamMetrics.write('class;tp;fn;fp;tn\n');
		for (var classId = 0; classId < allClasses.length; ++classId) {
			_class = allClasses[classId];
			var row = util.format('%s;%s;%s;%s;%s\n', _class,
					metrics[_class]['tp'], metrics[_class]['fn'],
					metrics[_class]['fp'], metrics[_class]['tn']);
			streamMetrics.write(row);
		}
		streamMetrics.write('\n');
		var row = util.format('%s;%s;%s;%s;%s\n', 'avg',
				metrics['totTp'], metrics['totFn'],
				metrics['totFp'], metrics['totTn']);
		streamMetrics.write(row);
		
		streamMetrics.end();
	});
}

function test() {
	return new Promise(function(resolve, reject) {
		Promise.map(
				queries,
				function(query) {
					console.log(query)
					var queriesPromises = [];
					queriesPromises.push(getMsChatbotScore(query.query,
							query.intents, query.entities));
					queriesPromises.push(getApiScore(query.query,
							query.intents, query.entities));
					queriesPromises.push(getWitScore(query.query,
							query.intents, query.entities));
					queriesPromises.push(getLuisScore(query.query,
							query.intents, query.entities));
					return Promise.all(queriesPromises);
				}, {
					concurrency : 1
				}).then(function(results) {
			saveResults(results);
			computeMetrics(results, 'MS CHATBOT');
			computeMetrics(results, 'API');
			computeMetrics(results, 'WIT');
			computeMetrics(results, 'LUIS');
		}, function(error) {
			reject(error);
		});
	});
}

test();