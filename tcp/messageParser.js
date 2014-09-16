var fs = require('fs')
	, path = require('path')
	, uuid = require('node-uuid')
	, Schema = require('protobuf').Schema
	, schema = new Schema(fs.readFileSync(path.resolve(__dirname, 'ges_client.desc')))
	, messageNamespace = 'EventStore.Client.Messages.' 

module.exports = {
	parse: parse
, serialize: serialize
}

function getMessageHandler(messageName) {
	return schema[messageNamespace + messageName]
}

function parse(messageName, payload) {
  return getMessageHandler(messageName).parse(payload)
}

function serialize(messageName, message) {
  return getMessageHandler(messageName).serialize(message)
}
