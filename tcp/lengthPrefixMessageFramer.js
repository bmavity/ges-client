var uuid = require('node-uuid')
	, messages = require('./tcp_commands')
	, flags = require('./tcp_flags')
	, lengthPrefixLength = 4
	, commandOffset = lengthPrefixLength
	, flagOffset = commandOffset + 1
	, correlationIdOffset = flagOffset + 1
	, authOffset = correlationIdOffset + 16

module.exports = {
	frame: frameMessage
, getContentLength: getContentLength
, unframe: unframe
}


function frameMessage(messageName, correlationId, payload, auth) {
  var username = !!auth ? auth.username : ''
  	, usernameOffset = authOffset + 1
  	, usernameLength = Buffer.byteLength(username)
  	, password = !!auth ? auth.password : ''
  	, passwordLengthOffset = usernameOffset + usernameLength
  	, passwordOffset = passwordLengthOffset + 1
  	, passwordLength = Buffer.byteLength(password)
  	, payloadOffset = !!auth ? passwordOffset + passwordLength : authOffset
	  , payloadSize = payload ? payload.length : 0
		, contentLength = payloadOffset + payloadSize - lengthPrefixLength
		, packet = new Buffer(contentLength + lengthPrefixLength)

  packet.writeUInt32LE(contentLength, 0)
  packet.writeUInt8(messages(messageName), commandOffset)

  if(auth) {
	  packet.writeUInt8(flags('Authenticated'), flagOffset)
  } else {
	  packet.writeUInt8(flags('None'), flagOffset)
  }

  uuid.parse(correlationId, packet, correlationIdOffset)

  if(auth) {
	  packet.writeUInt8(usernameLength, authOffset)
	  packet.write(username, usernameOffset)
	  packet.writeUInt8(passwordLength, passwordLengthOffset)
	  packet.write(password, passwordOffset)
	}

  if (payloadSize > 0) {
    payload.copy(packet, payloadOffset)
  }

  return packet
}

function getContentLength(packet) {
	return packet.readUInt32LE(0);
}

function unframe(packet) {
  return {
  	messageName: messages(packet.readUInt8(commandOffset))
	, flag: flags(packet.readUInt8(flagOffset))
	, correlationId: uuid.unparse(packet, correlationIdOffset)
	, payload: packet.slice(authOffset)
	}
}