var client = require('../')
    , uuid = require('node-uuid');

module.exports = function createTestEvent(eventId, data, metadata) {
    if (Array.isArray(eventId)) return eventId.map(function (i) {
        return createTestEvent(i.toString())
    });

    if (eventId && !isUuid(eventId)) {
        metadata = data;
        data = eventId;
        eventId = null
    }
    eventId = eventId || uuid.v4();
    data = data || eventId;
    metadata = metadata || 'metadata';

    var encodedData = new Buffer(data);
    var encodedMetadata = new Buffer(metadata);

    return client.createEventData(eventId, 'TestEvent', false, encodedData, encodedMetadata)
};


var regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function isUuid(str) {
    return regex.test(str)
}