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
	return schema.Serialize(message, messageNamespace + messageName)
}



var serializers = {

		 SubscribeToStream: function(payload) {
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
