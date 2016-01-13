var uuid = require('node-uuid')
    , position = require('./position');

module.exports = {
    toEventStoreEvent: toEventStoreEvent
    , toRecordedEvent: toRecordedEvent
    , toResolvedEvent: toResolvedEvent
};

function toEventStoreEvent(evt) {
    return {
        eventId: uuid.parse(evt.EventId, new Buffer(16))
        , eventType: evt.Type
        , dataContentType: evt.IsJson ? 1 : 0
        , metadataContentType: evt.IsJson ? 1 : 0
        , data: evt.Data
        , metadata: evt.Metadata
    }
}

function toRecordedEvent(systemRecord) {
    var recordedEvent = {}
        , metadata = systemRecord.hasOwnProperty('metadata') || systemRecord.metadata !== null ? systemRecord.metadata : new Buffer(0)
        , data = systemRecord.data === null ? new Buffer(0) : systemRecord.data;
    Object.defineProperties(recordedEvent, {
        EventStreamId: {value: systemRecord.eventStreamId, enumerable: true}
        , EventId: {value: uuid.unparse(systemRecord.eventId), enumerable: true}
        , EventNumber: {value: systemRecord.eventNumber, enumerable: true}
        , EventType: {value: systemRecord.eventType, enumerable: true}
        , Data: {value: data, enumerable: true}
        , Metadata: {value: metadata, enumerable: true}
        , IsJson: {value: systemRecord.dataContentType === 1, enumerable: true}
        , Created: {value: systemRecord.created, enumerable: true}
        , CreatedEpoch: {value: systemRecord.createdEpoch, enumerable: true}
    });
    return recordedEvent
}

function toResolvedEvent(payload) {
    var resolvedEvent = {}
        , evt = !payload.event ? null : toRecordedEvent(payload.event)
        , link = !payload.link ? null : toRecordedEvent(payload.link)
        , hasPosition = !!payload.commitPosition || payload.commitPosition === 0
        , originalEvent = link || evt;
    Object.defineProperties(resolvedEvent, {
        Event: {value: evt, enumerable: true}
        , IsResolved: {value: evt !== null && link !== null, enumerable: true}
        , Link: {value: link, enumerable: true}
        , OriginalEvent: {value: originalEvent, enumerable: true}
        , OriginalEventNumber: {value: !originalEvent ? null : originalEvent.EventNumber, enumerable: true}
        , OriginalPosition: {value: hasPosition ? position(payload) : null, enumerable: true}
        , OriginalStreamId: {value: !originalEvent ? null : originalEvent.EventStreamId, enumerable: true}
    });
    return resolvedEvent
}