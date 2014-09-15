var uuid = require('node-uuid')
	, messageParser = require('./messageParser')
	, position = require('./position')

module.exports = function(operationData) {
	var operation = operations[operationData.name]
	return new OperationItem(operation(operationData))
}


function OperationItem(operation) {
	this.toTcpMessage = function(correlationId) {
		return {
			messageName: operation.requestType
		, correlationId: correlationId
		, payload: operation.toRequestPayload()
		, auth: operation.auth
		}
	}

	this.finish = function(message) {
		var cb = operation.cb
			, payload
			
		try {
			payload = messageParser.parse(operation.responseType, message.payload)
		}
		catch(ex) {
			return cb(ex)
		}

		if(payload.result === 'AccessDenied') {
			return cb(new Error(payload.message))
		}

		//TODO: Investigate further if this is needed
		if(payload.result === 'StreamDeleted' && operation.requestType === 'WriteEvents') {
			return cb(new Error(payload.message))
		}
		
		if(payload.result === 'WrongExpectedVersion') {
			return cb(new Error(payload.message))
		}
		
		cb(null, operation.toResponseObject(payload))
	}
}



var operations = {
	AppendToStream: function(operationData) {
		return {
		  auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'WriteEvents'
		, toRequestPayload: function() {
				var payload = operationData.data
					, events = !payload.events ? [] : Array.isArray(payload.events) ? payload.events : [ payload.events ]
				return messageParser.serialize('WriteEvents', {
					eventStreamId: operationData.stream
				, expectedVersion: payload.expectedVersion
				, events: events.map(toEventStoreEvent)
				, requireMaster: !!payload.requireMaster
				})
			}
		, responseType: 'WriteEventsCompleted'
		, toResponseObject: function(payload) {
				var hasCommitPosition = payload.commitPosition || payload.commitPosition === 0
					, hasPreparePosition = payload.preparePosition || payload.preparePosition === 0

			  return {
			  	Status: payload.result
				, NextExpectedVersion: payload.lastEventNumber
			  , LogPosition: position(payload)
				}
			}
		}
	}
, DeleteStream: function(operationData) {
		return {
		  auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'DeleteStream'
		, toRequestPayload: function() {
				var payload = operationData.data
				return messageParser.serialize('DeleteStream', {
					eventStreamId: operationData.stream
				, expectedVersion: payload.expectedVersion
				, requireMaster: !!payload.requireMaster
				, hardDelete: !!payload.hardDelete
				})
			}
		, responseType: 'DeleteStreamCompleted'
		, toResponseObject: function(payload) {
			  return {
			  	Status: payload.result
			  , LogPosition: position(payload)
				}
			}
		}
	}
, ReadAllEventsBackward: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadAllEventsBackward'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadAllEvents', {
					commitPosition: payload.position.commitPosition
				, preparePosition: payload.position.preparePosition
				, maxCount: payload.maxCount
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadAllEventsCompleted'
		, toResponseObject: function(payload) {
				var events = payload.events || []
				return {
					Status: payload.result
				, Events: events.map(toResolvedEvent)
				, IsEndOfStream: events.length === 0
				, OriginalPosition: position(payload)
				, NextPosition: position({
						commitPosition: payload.nextCommitPosition
					, preparePosition: payload.nextPreparePosition
					})
				}
			}
		}
	}
, ReadAllEventsForward: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadAllEventsForward'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadAllEvents', {
					commitPosition: payload.position.commitPosition
				, preparePosition: payload.position.preparePosition
				, maxCount: payload.maxCount
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadAllEventsCompleted'
		, toResponseObject: function(payload) {
				var events = payload.events || []
				return {
					Status: payload.result
				, Events: events.map(toResolvedEvent)
				, IsEndOfStream: events.length === 0
				, OriginalPosition: position(payload)
				, NextPosition: position({
						commitPosition: payload.nextCommitPosition
					, preparePosition: payload.nextPreparePosition
					})
				}
			}
		}
	}
, ReadEvent: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadEvent'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadEvent', {
					eventStreamId: operationData.stream
				, eventNumber: payload.eventNumber
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadEventCompleted'
		, toResponseObject: function(payload) {
				return {
					Status: payload.result
				, Event: payload.result === 'Success' ? fromEventStoreEvent(payload.event) : null
				, Stream: operationData.stream
				, EventNumber: operationData.data.eventNumber
				}
			}
		}
	}
, ReadStreamEventsBackward: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadStreamEventsBackward'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadStreamEvents', {
					eventStreamId: operationData.stream
				, fromEventNumber: payload.start
				, maxCount: payload.count
				, resolveLinkTaos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadStreamEventsCompleted'
		, toResponseObject: function(payload) {
				var events = payload.events || []
				return {
					Status: payload.result
				, Events: events.map(fromEventStoreEvent)
				, NextEventNumber: payload.nextEventNumber
				, LastEventNumber: payload.lastEventNumber
				, IsEndOfStream: payload.isEndOfStream
				}
			}
		}
	}
, ReadStreamEventsForward: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadStreamEventsForward'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadStreamEvents', {
					eventStreamId: operationData.stream
				, fromEventNumber: payload.start
				, maxCount: payload.count
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadStreamEventsCompleted'
		, toResponseObject: function(payload) {
				var events = payload.events || []
				return {
					Status: payload.result
				, Events: events.map(fromEventStoreEvent)
				, NextEventNumber: payload.nextEventNumber
				, LastEventNumber: payload.lastEventNumber
				, IsEndOfStream: payload.isEndOfStream
				}
			}
		}
	}
}


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

function fromEventStoreEvent(rawEvent) {
	var recordedEvent = toRecordedEvent(rawEvent.event)
		, recordedLink = rawEvent.link ? toRecordedEvent(rawEvent.link) : null
	return {
		Event: recordedEvent
	, Link: recordedLink
	, OriginalEvent: recordedLink || recordedEvent
	}
}

function toRecordedEvent(systemRecord) {
	var recordedEvent = {}
		, metadata = systemRecord.hasOwnProperty('metadata') || systemRecord.metadata !== null ? systemRecord.metadata : new Buffer(0)
		, data = systemRecord.data === null ? new Buffer(0) : systemRecord.data
	Object.defineProperties(recordedEvent, {
		EventStreamId: { value: systemRecord.eventStreamId, enumerable: true }
  , EventId: { value: uuid.unparse(systemRecord.eventId), enumerable: true }
  , EventNumber: { value: systemRecord.eventNumber, enumerable: true }
  , EventType: { value: systemRecord.eventType, enumerable: true }
  , Data: { value: data, enumerable: true }
  , Metadata: { value: metadata, enumerable: true }  
  , IsJson: { value: systemRecord.dataContentType === 1, enumerable: true }
  , Created: { value: systemRecord.created, enumerable: true }
  , CreatedEpoch: { value: systemRecord.createdEpoch, enumerable: true }
	})
	return recordedEvent
}

function toResolvedEvent(payload) {
	var resolvedEvent = {}
	Object.defineProperties(resolvedEvent, {
		Event: { value: toRecordedEvent(payload.event), enumerable: true }
	, Link: { value: !payload.link ? null : toRecordedEvent(payload.link), enumerable: true }
	, OriginalPosition: { value: position(payload), enumerable: true }
	})
	return resolvedEvent
}
