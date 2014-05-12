var net = require('net')
	, uuid = require('node-uuid')
	, parser = require('./messageParser')
	, framer = require('./lengthPrefixMessageFramer')
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
	, incompletePacket
	, client

module.exports = connect


function connect(cb) {
	client = net.connect(1113, '127.0.0.1', function() { 
	  console.log('client connected')
				
		cb(null, {
			readAllEventsForward: function() {
			  sendMessage('ReadAllEventsForward', uuid.v4(), parser.serialize('ReadAllEvents', {
					commit_position: 0
				, prepare_position: 0
				, max_count: 1000
				, resolve_link_tos: false
				, require_master: false
				}), true)
			}
		})
	})

	client.on('data', receiveMessage)

	client.on('end', function() {
	  console.log('client disconnected')
	})
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
  console.log('Incomplete Packet (wanted: ' + expectedPacketLength + " bytes, got: " + packet.length + " bytes)")
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
