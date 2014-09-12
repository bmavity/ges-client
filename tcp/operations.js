var uuid = require('node-uuid')
	, messageParser = require('./messageParser')

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
		, auth: null
		}
	}

	this.finish = function(message) {
		var payload = messageParser.parse(operation.responseType, message.payload)
			, cb = operation.cb

		if(payload.result === 'WrongExpectedVersion') {
			return cb(new Error(payload.message))
		}
		
		cb(null, operation.toResponseObject(payload))
	}
}



var operations = {
	AppendToStream: function(operationData) {
		return {
		  cb: operationData.cb
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
				, LogPosition: {
						CommitPosition: hasCommitPosition ? payload.commit_position : -1
					, PreparePosition: hasPreparePosition ? payload.prepare_position : -1
					}
				}
			}
		}
	}
, ReadStreamEventsForward: function(operationData) {
		return {
			cb: operationData.cb
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
				//payload = parser.parse('ReadStreamEventsCompleted', message)

		/*
			public readonly SliceReadStatus Status;
		  public readonly string Stream;
		  public readonly int FromEventNumber;
		  public readonly ReadDirection ReadDirection;
		  public readonly ResolvedEvent[] Events;
		  public readonly int NextEventNumber;
		  public readonly int LastEventNumber;
		  public readonly bool IsEndOfStream;


		  repeated ResolvedIndexedEvent events = 1;
			required ReadStreamResult result = 2;
			required int32 next_event_number = 3;
			required int32 last_event_number = 4;
			required bool is_end_of_stream = 5;
			required int64 last_commit_position = 6;

			optional string error = 7;
		*/
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
	/*
	required bytes event_id = 1;
	required string event_type = 2;
	required int32 data_content_type = 3;
	required int32 metadata_content_type = 4;
	required bytes data = 5;
	optional bytes metadata = 6;
	*/
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
	/*
	required EventRecord event = 1;
	optional EventRecord link = 2;
	*/
	return {
		Event: toRecordedEvent(rawEvent.event)
	, Link: rawEvent.link ? toRecordedEvent(rawEvent.link) : null
	}
}

function toRecordedEvent(systemRecord) {
	/*
	required string event_stream_id = 1;
	required int32 event_number = 2;
	required bytes event_id = 3;
	required string event_type = 4;
	required int32 data_content_type = 5;
	required int32 metadata_content_type = 6;
	required bytes data = 7;
	optional bytes metadata = 8;
	optional int64 created = 9;
	optional int64 created_epoch = 10;
	*/
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