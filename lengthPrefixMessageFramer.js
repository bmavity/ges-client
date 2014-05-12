var uuid = require('node-uuid')
	, messages = require('./tcp_commands')
	, flags = require('./tcp_flags')
	, lengthPrefixLength = 4
	, commandOffset = lengthPrefixLength
	, flagOffset = commandOffset + 1
	, correlationIdOffset = flagOffset + 1
	, payloadOffset = correlationIdOffset + 16

module.exports = {
	frame: frameMessage
}


function frameMessage(messageName, correlationId, payload, auth) {
  var payloadSize = payload ? payload.length : 0
		, contentLength = payloadOffset + payloadSize - lengthPrefixLength
		, packet = new Buffer(contentLength + lengthPrefixLength)

  packet.writeUInt32LE(contentLength, 0)
  packet.writeUInt8(messages(messageName), commandOffset)
  packet.writeUInt8(flags('None'), flagOffset)
  uuid.parse(correlationId, packet, correlationIdOffset)

  if (payloadSize > 0) {
    payload.copy(packet, payloadOffset)
  }

  return packet
}