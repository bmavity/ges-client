var util = require('util')
	, EventEmitter = require('events').EventEmitter
	, parser = require('./messageParser')
	, framer = require('./lengthPrefixMessageFramer')

module.exports = EsTcpPayloadParser


function EsTcpPayloadParser(socket) {
	if(!(this instanceof EsTcpPayloadParser)) {
		return new EsTcpPayloadParser(socket)
	}

	var me = this

	socket.on('data', function(data) {
		me._receiveMessage(data)
	})

	EventEmitter.call(this)

	this._incompletePacket = null
}
util.inherits(EsTcpPayloadParser, EventEmitter)

EsTcpPayloadParser.prototype._receiveMessage = function(data) {
	if(this._incompletePacket) {
		data = this._combineWithIncompletePacket(data)
  }

  var contentLength = framer.getContentLength(data)
  	, expectedPacketLength = contentLength + 4

  if(data.length === expectedPacketLength) {
  	this._handleCompletePacket(data)
  } else if (data.length > expectedPacketLength) {
  	this._handleMultiplePackets(data, expectedPacketLength)
  } else {
    this._handleIncompletePacket(data, expectedPacketLength)
  }
}

EsTcpPayloadParser.prototype._combineWithIncompletePacket = function(packet) {
  var newPacket = new Buffer(incompletePacket.length + packet.length)
  this._incompletePacket.copy(newPacket, 0)
  packet.copy(newPacket, incompletePacket.length)
  this._incompletePacket = null
  return newPacket
}

EsTcpPayloadParser.prototype._handleCompletePacket = function(packet) {
	var unframedPacket = framer.unframe(packet)
	this.emit('message', unframedPacket)
}

EsTcpPayloadParser.prototype._handleIncompletePacket = function(packet, expectedPacketLength) {
  //console.log('Incomplete Packet (wanted: ' + expectedPacketLength + " bytes, got: " + packet.length + " bytes)")
	this._incompletePacket = packet
}

EsTcpPayloadParser.prototype._handleMultiplePackets = function(packet, expectedPacketLength) {
  //console.log("Packet too big, trying to split into multiple packets (wanted: " + expectedPacketLength + " bytes, got: " + packet.length + " bytes)")
  this._receiveMessage(packet.slice(0, expectedPacketLength))
  this._receiveMessage(packet.slice(expectedPacketLength))
}