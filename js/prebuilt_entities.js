var prebuiltEntities = {
	number : {
		WIT : 'wit/number',
		LUIS : 'number',
		API : 'sys.number'
	},
	datetime:{
		WIT : 'wit/datetime',
		LUIS : 'datetime',
		API : 'sys.date-time'
	},
	location:{
		WIT : 'wit/location',
		LUIS : 'geography',
		API : 'sys.location'
	}
};
module.exports = prebuiltEntities;