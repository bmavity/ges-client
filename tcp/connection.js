var net = require('net')
	, EventEmitter = require('events').EventEmitter
	, util = require('util')
	, uuid = require('node-uuid')
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

				cb(null, {
					Status: payload.result
				, Events: []
				})
			}
		, 'WriteEventsCompleted': function(correlationId, payload, cb) {
				payload = parser.parse('WriteEventsCompleted', payload)
				if(payload.result === 'WrongExpectedVersion') {
					return cb(new Error(payload.message))
				}
				cb(null, {
					NextExpectedVersion: payload.last_event_number
				, LogPosition: {
						CommitPosition: payload.hasOwnProperty('commit_position') ? payload.commit_position : -1
					, PreparePosition: payload.hasOwnProperty('prepare_position') ? payload.prepare_position : -1
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


function createConnection(opts) {
	opts = opts || {}
	opts.host = opts.host || '127.0.0.1'
	opts.port = opts.port || 1113
	var socket = net.connect(opts.port, opts.host)

	return new EsTcpConnection(socket)
}


function EsTcpConnection(socket) {
	EventEmitter.call(this)

	var me = this
		, receiver = messageReceiver(socket)
		, sender = messageSender(socket)

	socket.on('connect', function() {
		me.emit.apply(me, ['connect'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	socket.on('error', function() {
		me.emit.apply(me, ['error'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	receiver.on('message', function(message) {
		console.log('Received message: ', message.messageName)
  	var handler = commandHandlers[message.messageName]
	  if(!handler) return
	  
	  var correlationId = message.correlationId
			, waitingCallback = me._callbacks[correlationId]
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
}
util.inherits(EsTcpConnection, EventEmitter)

EsTcpConnection.prototype.appendToStream = function(streamName, events, expectedVersion, cb) {
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
	, event_type: evt.EventType
	, data_content_type: 1
	, metadata_content_type: 1
	, data: new Buffer(JSON.stringify(evt.Data))
	, metadata: new Buffer(JSON.stringify(evt.Metadata))
	}
}


EsTcpConnection.prototype._storeCallback = function(correlationId, cb) {
	this._callbacks[correlationId] = cb
}

