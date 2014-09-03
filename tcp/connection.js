var net = require('net')
	, Readable = require('stream').Readable
	, EventEmitter = require('events').EventEmitter
	, util = require('util')
	, uuid = require('node-uuid')
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
	, incompletePacket
	, client
	, stream

module.exports = createConnection


function createConnection() {
	var socket = net.connect(1113, '127.0.0.1')

	return new Connection(socket)
}


function EventStream() {
	Readable.call(this, {
		objectMode: true
	})

	this._es = []
	this_hasStarted = false
}
util.inherits(EventStream, Readable)

EventStream.prototype._read = function() {
	console.log('in _read')

	if(this._hasStarted && !this._es.length) {
		this.push(null)
	}
}

EventStream.prototype.writeEvents = function() {
	var evt = this._es.shift()

	while(evt && this.push(evt)) {
		evt = this._es.shift()
	}
}

EventStream.prototype.addEvents = function(events) {
	this._es = this._es.concat(events)
	this._hasStarted = true
	this.writeEvents()
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

function Connection(socket) {
	EventEmitter.call(this)

	var me = this

	socket.on('connect', function() {
		me.emit.apply(me, ['connect'].concat(arguments))
	})
/*
	socket.on('data', receiveMessage)

	socket.on('end', function() {
	  console.log('client disconnected')
	})
*/
}
util.inherits(Connection, EventEmitter)

Connection.prototype.appendToStream = function(streamName, events, cb) {
	sendMessage('WriteEvents', uuid.v4(), parser.serialize('WriteEvents', {
		event_stream_id: streamName
	, expected_version: 0
	, events: []
	, require_master: true
	}))
}

function toEventStoreEvent(evt) {
	return {
		
	}
}

Connection.prototype.readAllEventsForward = function() {
	stream = new EventStream()
  sendMessage('ReadAllEventsForward', uuid.v4(), parser.serialize('ReadAllEvents', {
		commit_position: 0
	, prepare_position: 0
	, max_count: 1000
	, resolve_link_tos: false
	, require_master: false
	}), true)
	return stream
}

function combineWithIncompletePacket(packet) {
  var newPacket = new Buffer(incompletePacket.length + packet.length)
  incompletePacket.copy(newPacket, 0)
  packet.copy(newPacket, incompletePacket.length)
  incompletePacket = null
  return newPacket
}

function handleCompletePacket(packet) {
	var unframedPacket = framer.unframe(packet)
  	, handler = commandHandlers[unframedPacket.command]

  console.log("Received " + unframedPacket.command
  	+ " command with flag: " + unframedPacket.flag
  	+ " and correlation id: " + unframedPacket.correlationId
	)

  if(!handler) return

  handler(unframedPacket.correlationId, unframedPacket.payload)
}

function handleIncompletePacket(packet, expectedPacketLength) {
  //console.log('Incomplete Packet (wanted: ' + expectedPacketLength + " bytes, got: " + packet.length + " bytes)")
	incompletePacket = packet
}

function handleMultiplePackets(packet, expectedPacketLength) {
  console.log("Packet too big, trying to split into multiple packets (wanted: " + expectedPacketLength + " bytes, got: " + packet.length + " bytes)")
  receiveMessage(packet.slice(0, expectedPacketLength))
  receiveMessage(packet.slice(expectedPacketLength))
}

function receiveMessage(data) {
	if(incompletePacket) {
		data = combineWithIncompletePacket(data)
  }

  var contentLength = framer.getContentLength(data)
  	, expectedPacketLength = contentLength + 4

  if (data.length === expectedPacketLength) {
  	handleCompletePacket(data)
  } else if (data.length > expectedPacketLength) {
  	handleMultiplePackets(data, expectedPacketLength)
  } else {
    handleIncompletePacket(data, expectedPacketLength)
  }
}

function sendMessage(messageName, correlationId, payload, auth) {
	var packet = framer.frame(messageName, correlationId, payload, auth)

  console.log("Sending " + messageName + " message with correlation id: " + correlationId)

  client.write(packet)
}
