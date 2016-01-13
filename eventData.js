module.exports = function EventData(eventId, type, isJson, data, metadata) {
    if (!(this instanceof EventData)) {
        return new EventData(eventId, type, isJson, data, metadata)
    }

    isJson = !!isJson;
    data = data || new Buffer(0);
    metadata = metadata || new Buffer(0);

    Object.defineProperties(this, {
        EventId: {value: eventId, enumerable: true}
        , Type: {value: type, enumerable: true}
        , IsJson: {value: isJson, enumerable: true}
        , Data: {value: data, enumerable: true}
        , Metadata: {value: metadata, enumerable: true}
    })
};