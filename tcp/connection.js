var net = require('net')
	, EventEmitter = require('events').EventEmitter
	, util = require('util')
	, uuid = require('node-uuid')
	, connectionLogicHandler = require('./connectionLogicHandler')
	, messageReceiver = require('./messageReceiver')
	, messageSender = require('./messageSender')
	, parser = require('./messageParser')
	, commandHandlers = {
			'HeartbeatRequestCommand': function(correlationId) {
				return {
					messageName: 'HeartbeatResponseCommand'
				, correlationId: correlationId
				}
			}
		, 'ReadAllEventsForwardCompleted': function(correlationId, payload, cb) {
				var a = parser.parse('ReadAllEventsCompleted', payload)
		  		, events = a.events
				  		.filter(isClientEvent)
				  		.map(parseEventStoreEvent)
				cb(null, events)
			}
		, 'ReadStreamEventsForwardCompleted': function(correlationId, payload, cb) {
				payload = parser.parse('ReadStreamEventsCompleted', payload)

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
		, 'WriteEventsCompleted': function(correlationId, payload, cb) {
				payload = parser.parse('WriteEventsCompleted', payload)

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

function isClientEvent(evt) {
	return evt.event.event_type.indexOf('$') !== 0
}
 
function parseEventStoreEvent(rawEvent) {
	var evt = rawEvent.event
	evt.event_id = uuid.unparse(evt.event_id)
	evt.data = JSON.parse(evt.data.toString())
	evt.metadata = JSON.parse(evt.metadata.toString())
	return evt
}

module.exports = createConnection


function createConnection(opts, cb) {
	opts = opts || {}
	opts.host = opts.host || '127.0.0.1'
	opts.port = opts.port || 1113
	var socket = net.connect(opts.port, opts.host)
		, connection = new EsTcpConnection(socket, {
				host: opts.host
			, port: opts.port
			})
		, onConnect = function() {
				connection.removeListener('connect', onConnect)
				connection.removeListener('error', onErr)
				cb(null, connection)
			}
		, onErr = function(err) {
				connection.removeListener('connect', onConnect)
				connection.removeListener('error', onErr)
				cb(err)
			}

	if(cb) {
		connection.on('connect', onConnect)
		connection.on('error', onErr)
	}

	if(!opts.requireExplicitConnection) {
		connection.connect()
	}

	return connection
}


function EsTcpConnection(socket, endPoint) {
	EventEmitter.call(this)

	var me = this
		, receiver = messageReceiver(socket)
		, sender = messageSender(socket)

	socket.on('connect', function() {
		//me.emit.apply(me, ['connect'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	socket.on('error', function() {
		me.emit.apply(me, ['error'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	receiver.on('message', function(message) {
		//console.log('Received message: ', message.messageName)
  	var handler = commandHandlers[message.messageName]
	  if(!handler) return
	  
	  var correlationId = message.correlationId
			, waitingCallback = me._callbacks[correlationId] || me._subscriptions[correlationId]
			, toSend = handler(correlationId, message.payload, waitingCallback)
		if(toSend) {
			sender.send(toSend)
		}
		if(waitingCallback) {
			delete me._callbacks[correlationId]
		}
	})
/*
	socket.on('end', function() {
	  console.log('client disconnected')
	})
*/

	this._sender = sender
	this._callbacks = {}
	this._subscriptions = {}
	this._endPoint = endPoint

	this._handler = connectionLogicHandler()

	this._handler.on('connect', function(args) {
		me.emit.apply(me, ['connect'].concat(Array.prototype.slice.call(arguments, 0)))
	})
}
util.inherits(EsTcpConnection, EventEmitter)

EsTcpConnection.prototype.appendToStream = function(streamName, expectedVersion, events, cb) {
	if(!cb && typeof events === 'function') {
		cb = events
		events = []
	}
	if(!Array.isArray(events)) {
		events = [ events ]
	}

  var correlationId = uuid.v4()
	this._storeCallback(correlationId, cb)

	this._sender.send({
		messageName: 'WriteEvents'
	, correlationId: correlationId
	, payload: {
			name: 'WriteEvents'
		, data: {
				event_stream_id: streamName
			, expected_version: expectedVersion
			, events: events.map(toEventStoreEvent)
			, require_master: true
			}
		}
	})
}

EsTcpConnection.prototype.close = function(cb) {
	this._handler.enqueueMessage('CloseConnection', {
		reason: 'Connection close requested by client.'
	, exception: null
	}, cb)
}

EsTcpConnection.prototype.connect = function() {
	this._handler.enqueueMessage('StartConnection', {
		endPoint: this._endPoint
	})
}

EsTcpConnection.prototype.isInState = function(stateName) {
	return this._handler.isInState(stateName)
}

EsTcpConnection.prototype.readAllEventsForward = function(cb) {
  var correlationId = uuid.v4()
	this._storeCallback(correlationId, cb)

  this._sender.send({
  	messageName: 'ReadAllEventsForward'
  , correlationId: correlationId
  , payload: {
  		name: 'ReadAllEvents'
  	, data: {
				commit_position: 0
			, prepare_position: 0
			, max_count: 1000
			, resolve_link_tos: false
			, require_master: false
			}
		}
	})
}


EsTcpConnection.prototype.readStreamEventsForward = function(streamName, options, cb) {
	if(options.start < 0) {
		setImmediate(function() {
			cb(new Error('Argument: start must be non-negative.'))
		})
		return
	}
	if(options.count <= 0) {
		setImmediate(function() {
			cb(new Error('Argument: count must be positive.'))
		})
		return
	}
  var correlationId = uuid.v4()
	this._storeCallback(correlationId, cb)

  this._sender.send({
  	messageName: 'ReadStreamEventsForward'
  , correlationId: correlationId
  , payload: {
  		name: 'ReadStreamEvents'
  	, data: {
				event_stream_id: streamName
			, from_event_number: options.start
			, max_count: options.count
			, resolve_link_tos: !!options.resolveLinkTos
			, require_master: !!options.requireMaster
			}
		}
	})
}

EsTcpConnection.prototype.subscribeToStream = function(stream, resolveLinkTos) {
	var correlationId = uuid.v4()
		, subscription = new EsSubscription(this, correlationId)
	this._storeSubscription(correlationId, subscription)

  this._sender.send({
  	messageName: 'SubscribeToStream'
  , correlationId: correlationId
  , payload: {
  		name: 'SubscribeToStream'
  	, data: {
				event_stream_id: stream
			, resolve_link_tos: !!resolveLinkTos
			}
		}
	})

	return subscription
}

EsTcpConnection.prototype.unsubscribe = function(correlationId) {
  this._sender.send({
  	messageName: 'UnsubscribeFromStream'
  , correlationId: correlationId
	})
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


EsTcpConnection.prototype._storeCallback = function(correlationId, cb) {
	this._callbacks[correlationId] = cb
}

EsTcpConnection.prototype._storeSubscription = function(correlationId, subscription) {
	this._subscriptions[correlationId] = subscription
}


function EsSubscription(connection, correlationId) {
	this._connection = connection
	this._correlationId = correlationId

	EventEmitter.call(this)
}
util.inherits(EsSubscription, EventEmitter)


EsSubscription.prototype.unsubscribe = function() {
	this._connection.unsubscribe(this._correlationId)
}
