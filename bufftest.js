var uuid = require('node-uuid')
	, parser = require('./messageParser')
	, framer = require('./lengthPrefixMessageFramer')
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
			
  sendMessage('ReadAllEventsForward', uuid.v4(), parser.serialize('ReadAllEvents', {
		commit_position: 0
	, prepare_position: 0
	, max_count: 1000
	, resolve_link_tos: false
	, require_master: false
	}), true)
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

  var contentLength = framer.getContentLength(data)
  var expectedPacketLength = contentLength + 4;
  if (data.length === expectedPacketLength) {
  	var unframedPacket = framer.unframe(data)
	  	, handler = commandHandlers[unframedPacket.command]
	  	
	  console.log("Received " + unframedPacket.command
	  	+ " command with flag: " + unframedPacket.flag
	  	+ " and correlation id: " + unframedPacket.correlationId
  	)

	  if(!handler) return

	  handler(unframedPacket.correlationId, unframedPacket.payload)
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

function sendMessage(messageName, correlationId, payload, auth) {
	var packet = framer.frame(messageName, correlationId, payload, auth)

  console.log("Sending " + messageName + " message with correlation id: " + correlationId)

  client.write(packet)
}
