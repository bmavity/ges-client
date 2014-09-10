var fs = require('fs')
	, path = require('path')
	, uuid = require('node-uuid')
	, Schema = require('node-protobuf')
	, schema = new Schema(fs.readFileSync(path.resolve(__dirname, 'ges_client.desc')))
	, messageNamespace = 'EventStore.Client.Messages.' 

module.exports = {
	parse: parse
, serialize: serialize
}


function parse(messageName, payload) {
  return schema.Parse(payload, messageNamespace + messageName)
}

function serialize(messageName, message) {
	var matchingSerializer = serializers[messageName]
	if(!matchingSerializer) return null
  var serialized = matchingSerializer(message)
  return schema.Serialize(serialized.payload, messageNamespace + serialized.name)
}



var serializers = {
	  	ReadStreamEventsForward: function(payload) {
	  		var name = 'ReadStreamEvents'
	  		return {
	  			name: name
	  		, payload: {
							event_stream_id: payload.stream
						, from_event_number: payload.start
						, max_count: payload.count
						, resolve_link_tos: payload.resolveLinkTos
						, require_master: payload.requireMaster
		  		}
		  	}
	  	}
	  , WriteEvents: function(payload) {
		  	var name = 'WriteEvents'
		  	return {
					name: name
				, payload: {
						event_stream_id: payload.stream
					, expected_version: payload.expectedVersion
					, events: payload.events.map(toEventStoreEvent)
					, require_master: payload.requireMaster
					}
				}
		  }
		, SubscribeToStream: function(payload) {
				var name = 'SubscribeToStream'
				return {
					name: name
			  , payload: {
						event_stream_id: payload.stream
					, resolve_link_tos: payload.resolveLinkTos
					}
				}
			}
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
	, event_type: evt.Type
	, data_content_type: evt.IsJson ? 1 : 0
	, metadata_content_type: evt.IsJson ? 1 : 0
	, data: evt.Data
	, metadata: evt.Metadata
	}
}
