var uuid = require('node-uuid')
	, parser = require('./messageParser')
	, commands = require('./tcp_commands')
	, flags = require('./tcp_flags')
	, commandHandlers = {
			'HeartbeatRequestCommand': function(correlationId) {
		  	sendMessage('HeartbeatResponseCommand', correlationId)
			}
		, 'ReadAllEventsForwardCompleted': function(correlationId, payload) {
				var a = parser.parse('ReadAllEventsCompleted', payload)
		  	return console.log(a.events
		  		.filter(function(evt) {
		  			return evt.event.event_type.indexOf('$') !== 0
		  		})
		  		.map(function(evts) {
			  		var evt = evts.event
			  		evt.data = JSON.parse(evt.data.toString())
			  		evt.metadata = JSON.parse(evt.metadata.toString())
			  		return evt
		  	}))
			}
		}


var net = require('net')
var client = net.connect(1113, '127.0.0.1', function() { 
  console.log('client connected')
			
  sendAuthenticated('ReadAllEventsForward', parser.serialize('ReadAllEvents', {
		commit_position: 0
	, prepare_position: 0
	, max_count: 1000
	, resolve_link_tos: false
	, require_master: false
	}))
})

var _leftoverPacketData
client.on('data', function(data) {
	if (_leftoverPacketData) {
    var newPacket = new Buffer(_leftoverPacketData.length + data.length);
    _leftoverPacketData.copy(newPacket, 0);
    data.copy(newPacket, _leftoverPacketData.length);
    data = newPacket;
    _leftoverPacketData = null;
  }

  var contentLength = data.readUInt32LE(0);
  var expectedPacketLength = contentLength + 4;
  if (data.length === expectedPacketLength) {
		var packet = data.slice(4)
    var command = commands(packet.readUInt8(0));
    var flag = flags(packet.readUInt8(1))
	  var correlationId = uuid.unparse(packet, 2);
	  var payload = packet.slice(18)
	  console.log("Received " + command + " command with flag: " + flag + " and correlation id: " + correlationId);

	  var handler = commandHandlers[command]
	  if(!handler) return

	  return handler(correlationId, payload)
/*
	  if (packet.length > 17) {
	    payload = packet.slice(17);
	    schema.Parse(payload, 'EventStore.Client.Messages.' + command)
	  }
	  */
  } else if (data.length >= expectedPacketLength) {
    console.log("Packet too big, trying to split into multiple packets (wanted: " + expectedPacketLength + " bytes, got: " + data.length + " bytes)");
    this._onData(packet.slice(0, expectedPacketLength));
    this._onData(packet.slice(expectedPacketLength));
  } else {
    console.log("Crap, the packet isn't big enough. Maybe there's another packet coming? (wanted: " + expectedPacketLength + " bytes, got: " + data.length + " bytes)");
    _leftoverPacketData = data;
  }
})

client.on('end', function() {
  console.log('client disconnected')
})

function sendMessage(command, correlationId, payload, auth) {
	send(command, payload, correlationId)
}

function send(command, payload, correlation) {
  var correlationId = correlation || uuid.v4()
  	, payloadSize = payload ? payload.length : 0
  	, dataOffset = 4
  	, commandOffset = dataOffset
  	, flagOffset = commandOffset + 1
  	, correlationIdOffset = flagOffset + 1
  	, payloadOffset = correlationIdOffset + 16
  	, contentLength = payloadOffset + payloadSize - dataOffset
  	, packet = new Buffer(contentLength + dataOffset)

  packet.writeUInt32LE(contentLength, 0)
  packet.writeUInt8(commands(command), commandOffset)
  packet.writeUInt8(flags('None'), flagOffset)
  uuid.parse(correlationId, packet, correlationIdOffset)

  if (payloadSize > 0) {
    payload.copy(packet, payloadOffset)
  }

  console.log("Sending " + command + " command with correlation id: " + correlationId)
  client.write(packet)
}

function sendAuthenticated(command, payload, correlation) {
  var correlationId = correlation || uuid.v4()
  	, payloadSize = payload ? payload.length : 0
  	, dataOffset = 4
  	, commandOffset = dataOffset
  	, flagOffset = commandOffset + 1
  	, correlationIdOffset = flagOffset + 1
  	, authOffset = correlationIdOffset + 16
  	, usernameLengthOffset = authOffset
  	, usernameOffset = usernameLengthOffset + 1
  	, usernameLength = Buffer.byteLength('admin')
  	, passwordLengthOffset = usernameOffset + usernameLength
  	, passwordOffset = passwordLengthOffset + 1
  	, passwordLength = Buffer.byteLength('changeit')
  	, payloadOffset = passwordOffset + passwordLength
  	, contentLength = payloadOffset + payloadSize - dataOffset
  	, packet = new Buffer(contentLength + dataOffset)

  packet.writeUInt32LE(contentLength, 0)
  packet.writeUInt8(commands(command), commandOffset)
  packet.writeUInt8(flags('Authenticated'), flagOffset)
  uuid.parse(correlationId, packet, correlationIdOffset)
  packet.writeUInt8(usernameLength, usernameLengthOffset)
  packet.write('admin', usernameOffset)
  packet.writeUInt8(passwordLength, passwordLengthOffset)
  packet.write('changeit', passwordOffset)

  if (payloadSize > 0) {
    payload.copy(packet, payloadOffset)
  }

  console.log("Sending " + command + " command with correlation id: " + correlationId)
  client.write(packet)
}
