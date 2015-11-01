var uuid = require('node-uuid')
	, util = require('util')
	, messageParser = require('./messageParser')
	, position = require('./position')
	, eventPayloads = require('./eventPayloads')

module.exports = {
	appendToStream: require('./operations/appendToStreamOperation')
, commitTransaction: require('./operations/commitTransactionOperation')
, deleteStream: require('./operations/deleteStreamOperation')
, readStreamEventsBackward: require('./operations/readStreamEventsBackwardOperation')
, readStreamEventsForward: require('./operations/readStreamEventsForwardOperation')
, startTransaction: require('./operations/startTransactionOperation')
, transactionalWrite: require('./operations/transactionalWriteOperation')

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



}
