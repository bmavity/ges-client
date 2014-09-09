var tcpPackageConnection = require('./tcpPackageConnection')
	, operationsManager = require('./operationsManager')
	, util = require('util')
	, EventEmitter = require('events').EventEmitter
	, states = {
			Init: {
				CloseConnection: performCloseConnection
			, EstablishTcpConnection: noOp
			, HandleTcpPackage: noOp
			, StartConnection: function(message, cb) {
					this._endPoint = message.endPoint
					this._state = states['Connecting']
					this._connectingPhase = 'Reconnecting'
					this._discoverEndPoint(cb)
				}
			, StartOperation: function(operation, cb) {
					cb(new Error('EventStoreConnection is not active.'))
				}
			, TcpConnectionEstablished: noOp
			}
		, Connecting: {
				CloseConnection: performCloseConnection
			, EstablishTcpConnection: function(message) {
					if(this._connectingPhase !== 'EndPointDiscovery') return

					this._connectingPhase = 'ConnectionEstablishing'
					var me = this
						, connection = tcpPackageConnection({
								endPoint: this._endPoint
							})
					connection.on('connect', function() {
						me.enqueueMessage('TcpConnectionEstablished', {
							connection: connection
						})
					})
					connection.on('package', function(data) {
						me.enqueueMessage('HandleTcpPackage', {
							connection: data.connection
						, package: data.package
						})
					})
					this._connection = connection
				}
			, HandleTcpPackage: handlePackage
			, StartConnection: function(message, cb) {
					cb(null)
				}
			, StartOperation: function(operation, cb) {
					this._operations.enqueueOperation(operation, cb)
				}
			, TcpConnectionEstablished: function(message, cb) {
					if(this._connection !== message.connection || this.isClosed) return cb && cb(null)

					//TODO: Auth
					this.goToConnectedState()
				}
			}
		, Connected: {
				CloseConnection: performCloseConnection
			, EstablishTcpConnection: noOp
			, HandleTcpPackage: handlePackage
			, StartConnection: function(message, cb) {
					cb(null)
				}
			, StartOperation: function(operation, cb) {
					this._operations.scheduleOperation(operation, this._connection, cb)
				}
			, TcpConnectionEstablished: noOp
			}
		, Closed: {
				CloseConnection: noOp
			, EstablishTcpConnection: noOp
			, HandleTcpPackage: noOp
			, StartConnection: function(message, cb) {
					
				}
			, StartOperation: function(operation, cb) {
					cb(new Error('EventStoreConnection has been closed.'))
				}
			, TcpConnectionEstablished: noOp
			}
		}

module.exports = EsConnectionLogicHandler


function handlePackage(message) {
	if(this._connection !== message.connection) return noOp()

	var messageName = message.package.messageName

	if(messageName === 'HeartbeatResponseCommand') {
		console.log(message.package)
		return
	}

	if(messageName === 'HeartbeatRequestCommand') {
		this._connection.enqueueSend({
				messageName: 'HeartbeatResponseCommand'
			, correlationId: message.package.correlationId
		})
		return
	}

	var operation = this._operations.getActiveOperation(message.package.correlationId)
	if(operation) {
		var handler = commandHandlers[messageName]
		if(handler) {
			handler(message.package, operation.cb)
		} else {
			operation.cb(new Error('Handler not availble for operation: ' + messageName + ' with id ' + message.package.correlationId))
		}
	}
}

function performCloseConnection(message, cb) {
	this._setState('Closed')
	this._closeTcpConnection(message.reason, function(err) {
		cb(null)
	})
}

function noOp(message, cb) {
	cb && cb(null)
}	

function EsConnectionLogicHandler() {
	if(!(this instanceof EsConnectionLogicHandler)) {
		return new EsConnectionLogicHandler()
	}

	EventEmitter.call(this)


	this._handlers = {}

	this._connection = null
	this._endPoint = null
	this._state = null

	this._queuedMessages = []
	this._operations = operationsManager()

	this._setState('Init')
	this._connectingPhase = 'Invalid'
}
util.inherits(EsConnectionLogicHandler, EventEmitter)


EsConnectionLogicHandler.prototype._closeTcpConnection = function(reason, cb) {
	var me = this
	if(this._connection === null) return cb(null)

	this._connection.close(reason, function(err) {
		if(err) return cb(err)

		if(this._connection) {
			this._connection.removeAllListeners()
			this._connection = null
		}
		cb(null)
	})
}

EsConnectionLogicHandler.prototype._discoverEndPoint = function(cb) {
	if(!this.isInState('Connecting')) return cb(null)
	if(this._connectingPhase !== 'Reconnecting') return cb(null)

	this._connectingPhase = 'EndPointDiscovery'
	//TODO: True endpoint discovery
	this.enqueueMessage('EstablishTcpConnection', {
		endPoint: this._endPoint
	}, cb)
}

EsConnectionLogicHandler.prototype.enqueueMessage = function(messageName, message, cb) {
	var me = this
	this._queuedMessages.push({
		messageName: messageName
	, message: message
	, cb: cb
	})

	setImmediate(function() {
		me._processNextMessage()
	})
}

EsConnectionLogicHandler.prototype.goToConnectedState = function() {
	this._setState('Connected')
	this._connectingPhase = 'Connected'

	this.emit('connect', {
		endPoint: this._endPoint
	})
}

EsConnectionLogicHandler.prototype.isInState = function(stateName) {
	return this._state === states[stateName]
}

EsConnectionLogicHandler.prototype._processNextMessage = function() {
	var me = this
		, next = this._queuedMessages.shift()

	if(!next) return 
	//if(!handler) return next.cb && next.cb(new Error())
	var handler = this._state[next.messageName]
	handler.call(this, next.message, next.cb)

	setImmediate(function() {
		me._processNextMessage()
	})
}

EsConnectionLogicHandler.prototype._setState = function(stateName) {
	this._state = states[stateName]
}





var uuid = require('node-uuid')
	, parser = require('./messageParser')
	, commandHandlers = {
			
		 'ReadAllEventsForwardCompleted': function(correlationId, payload, cb) {
				var a = parser.parse('ReadAllEventsCompleted', payload)
		  		, events = a.events
				  		.filter(isClientEvent)
				  		.map(parseEventStoreEvent)
				cb(null, events)
			}
		, 'ReadStreamEventsForwardCompleted': function(message, cb) {
				payload = parser.parse('ReadStreamEventsCompleted', message.payload)

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

				cb(null, {
					Status: payload.result
				, Events: payload.events.map(fromEventStoreEvent)
				, NextEventNumber: payload.next_event_number
				, LastEventNumber: payload.last_event_number
				, IsEndOfStream: payload.is_end_of_stream
				})
			}
    , 'SubscriptionConfirmation': function(correlationId, payload, subscription) {
				payload = parser.parse('SubscriptionConfirmation', payload)
				//console.log('SubscriptionConfirmation', correlationId, payload)
			}
    , 'StreamEventAppeared': function(correlationId, payload, subscription) {
				payload = parser.parse('StreamEventAppeared', payload)

				//console.log('StreamEventAppeared', correlationId, payload)
				subscription.emit('event')
			}
    , 'SubscriptionDropped': function(correlationId, payload, subscription) {
				payload = parser.parse('SubscriptionDropped', payload)
				//console.log('SubscriptionDropped', correlationId, payload)
				subscription.emit('dropped')
			}
		, 'WriteEventsCompleted': function(message, cb) {
				payload = parser.parse('WriteEventsCompleted', message.payload)

				if(payload.result === 'WrongExpectedVersion') {
					return cb(new Error(payload.message))
				}

				var hasCommitPosition = payload.commit_position || payload.commit_position === 0
					, hasPreparePosition = payload.prepare_position || payload.prepare_position === 0

				//console.log(payload)
				cb(null, {
					NextExpectedVersion: payload.last_event_number
				, LogPosition: {
						CommitPosition: hasCommitPosition ? payload.commit_position : -1
					, PreparePosition: hasPreparePosition ? payload.prepare_position : -1
					}
				})
			}
		, 'BadRequest': function(correlationId, payload, cb) {
				cb(new Error(payload.toString()))
			}
		, 'NotHandled': function(correlationId, payload, cb) {
				payload = parser.parse('NotHandled', payload)
				cb(new Error(payload.reason))
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