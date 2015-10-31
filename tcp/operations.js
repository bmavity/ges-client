var uuid = require('node-uuid')
	, util = require('util')
	, messageParser = require('./messageParser')
	, position = require('./position')
	, eventPayloads = require('./eventPayloads')

module.exports = {
	appendToStream: require('./operations/appendToStreamOperation')
, deleteStream: require('./operations/deleteStreamOperation')
, readStreamEventsForward: require('./operations/readStreamEventsForwardOperation')
//, startTransaction: require('./operations/startTransactionOperation')

, inspection: require('./operations/inspection')
}




var operations = {
	
ReadAllEventsBackward: function(operationData) {
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
				, Events: events.map(eventPayloads.toResolvedEvent)
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
				, Events: events.map(eventPayloads.toResolvedEvent)
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
				, Event: payload.result === 'Success' ? eventPayloads.toResolvedEvent(payload.event) : null
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
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadStreamEventsCompleted'
		, toResponseObject: function(payload) {
				var events = payload.events || []
				return {
					Status: payload.result
				, Events: events.map(eventPayloads.toResolvedEvent)
				, NextEventNumber: payload.nextEventNumber
				, LastEventNumber: payload.lastEventNumber
				, IsEndOfStream: payload.isEndOfStream
				}
			}
		}
	}
, StartTransaction: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'TransactionStart'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('TransactionStart', {
					eventStreamId: operationData.stream
				, expectedVersion: payload.expectedVersion
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'TransactionStartCompleted'
		, toResponseObject: function(payload) {
				return {
					Result: payload.result
				, TransactionId: payload.transactionId
				, Message: payload.message
				}
			}
		}
	}
, TransactionalWrite: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'TransactionWrite'
		, toRequestPayload: function(payload) {
				var payload = operationData.data
					, events = !payload.events ? [] : Array.isArray(payload.events) ? payload.events : [ payload.events ]
				return messageParser.serialize('TransactionWrite', {
					transactionId: payload.transactionId
				, events: events.map(eventPayloads.toEventStoreEvent)
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'TransactionWriteCompleted'
		, toResponseObject: function(payload) {
				return {
					Result: payload.result
				, TransactionId: payload.transactionId
				, Message: payload.message
				}
			}
		}
	}
, CommitTransaction: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'TransactionCommit'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('TransactionCommit', {
					transactionId: payload.transactionId
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'TransactionCommitCompleted'
		, toResponseObject: function(payload) {
				return {
					Result: payload.result
				, TransactionId: payload.transactionId
				, Message: payload.message
				, FirstEventNumber: payload.firstEventNumber
				, NextExpectedVersion: payload.lastEventNumber
				, LogPosition: position(payload)
				}
			}
		}
	}
}
