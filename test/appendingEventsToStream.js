var uuid = require('node-uuid')
	, appender = require('../ges-appender')
	, events = [{
				eventType: 'MySecondEvent'
			, eventId : uuid.v4()
			, data : {
					name: 'hello world!'
				, number : Math.random()
				}
			, metadata: {
					addedDate: new Date()
				}
			}
		]

appender('test-a', events, function(err) {
	if(err) {
		
	}
})