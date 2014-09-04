var util = require('util')
	, EventEmitter = require('events').EventEmitter
	, parser = require('./messageParser')
	, framer = require('./lengthPrefixMessageFramer')

module.exports = TcpMessageSender


function TcpMessageSender(socket) {
	if(!(this instanceof TcpMessageSender)) {
		return new TcpMessageSender(socket)
	}

	this._socket = socket

	EventEmitter.call(this)
}
util.inherits(TcpMessageSender, EventEmitter)


TcpMessageSender.prototype.send = function(sendArgs) {
	var payload, auth
	var packet = framer.frame(sendArgs.messageName, sendArgs.correlationId, payload, auth)

  console.log("Sending " + sendArgs.messageName + " message with correlation id: " + sendArgs.correlationId)

  this._socket.write(packet)
}