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

		if(payload.result === 'StreamDeleted' && payload.error) {
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
					event_stream_id: operationData.stream
				, expected_version: payload.expectedVersion
				, events: events.map(toEventStoreEvent)
				, require_master: !!payload.requireMaster
				})
			}
		, responseType: 'WriteEventsCompleted'
		, toResponseObject: function(payload) {
				var hasCommitPosition = payload.commit_position || payload.commit_position === 0
					, hasPreparePosition = payload.prepare_position || payload.prepare_position === 0

			  return {
					NextExpectedVersion: payload.last_event_number
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
					event_stream_id: operationData.stream
				, expected_version: payload.expectedVersion
				, require_master: !!payload.requireMaster
				, hard_delete: !!payload.hardDelete
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
					commit_position: payload.position.commitPosition
				, prepare_position: payload.position.preparePosition
				, max_count: payload.maxCount
				, resolve_link_tos: !!payload.resolveLinkTos
				, require_master: !!payload.requireMaster
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
						commit_position: payload.next_commit_position
					, prepare_position: payload.next_prepare_position
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
					commit_position: payload.position.commitPosition
				, prepare_position: payload.position.preparePosition
				, max_count: payload.maxCount
				, resolve_link_tos: !!payload.resolveLinkTos
				, require_master: !!payload.requireMaster
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
						commit_position: payload.next_commit_position
					, prepare_position: payload.next_prepare_position
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
					event_stream_id: operationData.stream
				, event_number: payload.eventNumber
				, resolve_link_tos: !!payload.resolveLinkTos
				, require_master: !!payload.requireMaster
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
, ReadStreamEventsForward: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadStreamEventsForward'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadStreamEvents', {
					event_stream_id: operationData.stream
				, from_event_number: payload.start
				, max_count: payload.count
				, resolve_link_tos: !!payload.resolveLinkTos
				, require_master: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadStreamEventsCompleted'
		, toResponseObject: function(payload) {
				var events = payload.events || []
				return {
					Status: payload.result
				, Events: events.map(fromEventStoreEvent)
				, NextEventNumber: payload.next_event_number
				, LastEventNumber: payload.last_event_number
				, IsEndOfStream: payload.is_end_of_stream
				}
			}
		}
	}
}


function toEventStoreEvent(evt) {
	return {
		event_id: uuid.parse(evt.EventId, new Buffer(16))
	, event_type: evt.Type
	, data_content_type: evt.IsJson ? 1 : 0
	, metadata_content_type: evt.IsJson ? 1 : 0
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
		EventStreamId: { value: systemRecord.event_stream_id, enumerable: true }
  , EventId: { value: uuid.unparse(systemRecord.event_id), enumerable: true }
  , EventNumber: { value: systemRecord.event_number, enumerable: true }
  , EventType: { value: systemRecord.event_type, enumerable: true }
  , Data: { value: data, enumerable: true }
  , Metadata: { value: metadata, enumerable: true }  
  , IsJson: { value: systemRecord.data_content_type === 1, enumerable: true }
  , Created: { value: systemRecord.created, enumerable: true }
  , CreatedEpoch: { value: systemRecord.created_epoch, enumerable: true }
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
