var net = require('net')
	, EventEmitter = require('events').EventEmitter
	, util = require('util')
	, uuid = require('node-uuid')
	, tcpPayloadParser = require('./tcpPayloadParser')
	, parser = require('./messageParser')
	, framer = require('./lengthPrefixMessageFramer')
	, commandHandlers = {
			'HeartbeatRequestCommand': function(correlationId) {
		  	sendMessage('HeartbeatResponseCommand', correlationId)
			}
		, 'ReadAllEventsForwardCompleted': function(correlationId, payload) {
				var a = parser.parse('ReadAllEventsCompleted', payload)
		  		, events = a.events
				  		.filter(isClientEvent)
				  		.map(parseEventStoreEvent)
				stream.addEvents(events)
			}
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
		, payloadParser = tcpPayloadParser(socket)

	socket.on('connect', function() {
		me.emit.apply(me, ['connect'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	socket.on('error', function() {
		me.emit.apply(me, ['error'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	payloadParser.on('message', function(message) {
  	var handler = commandHandlers[message.command]
	  if(!handler) return
	  handler(message.correlationId, message.payload)
		/*
		  console.log("Received " + unframedPacket.command
		  	+ " command with flag: " + unframedPacket.flag
		  	+ " and correlation id: " + unframedPacket.correlationId
			)
		*/
	})
/*
	socket.on('end', function() {
	  console.log('client disconnected')
	})
*/

	this._socket = socket
}
util.inherits(EsTcpConnection, EventEmitter)

EsTcpConnection.prototype.appendToStream = function(streamName, events, cb) {
	this.sendMessage('WriteEvents', uuid.v4(), parser.serialize('WriteEvents', {
		event_stream_id: streamName
	, expected_version: 0
	, events: []
	, require_master: true
	}))
}

EsTcpConnection.prototype.sendMessage = function(messageName, correlationId, payload, auth) {
	var packet = framer.frame(messageName, correlationId, payload, auth)

  console.log("Sending " + messageName + " message with correlation id: " + correlationId)

  this._socket.write(packet)
}

