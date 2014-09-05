var uuid = require('node-uuid')
	, eventData = require('../eventData')

module.exports = function createTestEvent(eventId, data, metadata) {
	if(eventId && !isUuid(eventId)) {
		metadata = data
		data = eventId
		eventId = null
	}
	eventId = eventId || uuid.v4()
	var encodedData = new Buffer(data || eventId)
  var encodedMetadata = new Buffer(metadata || 'metadata');

  return eventData(eventId, 'TestEvent', false, encodedData, encodedMetadata);
}


var regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

function isUuid(str) {
	return regex.test(str)
}