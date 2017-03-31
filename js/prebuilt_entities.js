var prebuiltEntities = {
	number : {
		WIT : 'wit/number',
		LUIS : 'number',
		API : 'sys.number'
	},
	datetime : {
		WIT : 'wit/datetime',
		LUIS : 'datetime',
		API : 'sys.date-time'
	},
	location : {
		WIT : 'wit/location',
		LUIS : 'geography',
		API : 'sys.location'
	},
	money : {
		WIT : 'wit/amount_of_money',
		LUIS : 'money',
		API : 'sys.unit-currency'
	}
};
module.exports = prebuiltEntities;