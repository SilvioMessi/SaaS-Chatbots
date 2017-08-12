var Promise = require('bluebird');
var fs = require('fs');
var genericIntents = require('../data/intents.json');

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

function createDataSets(percentageTrainig) {
	var testIntents = [];
	if (percentageTrainig < 0 || percentageTrainig > 1)
		return;
	for (var intentIndex = 0; intentIndex < genericIntents.length; intentIndex ++){
		var trainingIndex = Math.ceil(genericIntents[intentIndex].entries.length * percentageTrainig);
		var tmp = shuffle(genericIntents[intentIndex].entries);
		var trainingIntents = tmp.slice(0, trainingIndex);
		// creation of training set
		genericIntents[intentIndex].entries = trainingIntents;
		var testIntentEntries = tmp.slice(trainingIndex);
		// creation of test set
		for (var entryIndex = 0; entryIndex < testIntentEntries.length; entryIndex ++){
			var entry = testIntentEntries[entryIndex];
			var item = { 
				'query' : '',
				'intents' : [genericIntents[intentIndex].id],
				'entities' : [],
			};
			for (var textIndex = 0; textIndex < entry.value.length; textIndex ++){
				if ('entity' in entry.value[textIndex]){
					var entity = {};
					var entityId = entry.value[textIndex].entity
					entity[entityId] = entry.value[textIndex].text;
					item.entities.push(entity);
				}
				item.query += entry.value[textIndex].text;
			}
			testIntents.push(item);
		}
	}
	fs.writeFile("../data/intents_training_set.json", JSON.stringify(genericIntents), function(err) {
	    if(err) {
	        return console.log(err);
	    }
	});
	fs.writeFile("../data/intents_test_set.json", JSON.stringify(testIntents), function(err) {
	    if(err) {
	        return console.log(err);
	    }
	});
}
	
createDataSets(0.5);