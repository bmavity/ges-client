var path = require('path')
	, uuid = require('node-uuid')
	, protobuf = require('protobufjs')

protobuf.convertFieldsToCamelCase = true
protobuf.populateAccessors = false

var builder = protobuf.loadProtoFile(path.resolve(__dirname, 'ges_client.proto'))
	, messageNamespace = 'EventStore.Client.Messages.' 
	, messages = builder.build('EventStore').Client.Messages

module.exports = {
	parse: parse
, serialize: serialize
}

function getMessageClass(messageName) {
	return messages[messageName]
}

function parse(messageName, payload) {
	var MessageClass = getMessageClass(messageName)
  return convertToClientObj(MessageClass.decode(payload).toRaw(false, true))
}

function serialize(messageName, message) {
	var MessageClass = getMessageClass(messageName)
	return new MessageClass(message).encode().toBuffer()
}


function isObject(obj) {
	return Object.prototype.toString.call(obj) === '[object Object]'
}


function convertToClientObj(objToConvert) {
	var convertedObj = Object.keys(objToConvert).reduce(function(obj, name) {
		var val = objToConvert[name]
			, type = getType(objToConvert, name)

		if(type && isEnum(type)) {
			obj[name] = getEnumValue(type, val)
		} else if(protobuf.ByteBuffer.isByteBuffer(val)) {
			obj[name] = val.toBuffer()
		} else if(isObject(val)) {
			obj[name] = convertToClientObj(val)
		}

		return obj
	}, objToConvert)
	return convertedObj
}

function getType(obj, name) {
	if(!obj.$type) return null
	if(!obj.$type.children) return null
	var matchingChild = obj.$type.children.filter(function(child) {
		return child.name === name
	})[0]
	return matchingChild && matchingChild.element ? matchingChild.element.resolvedType : null
}

function isEnum(type) {
	return type && type.className === 'Enum' && type.children
}

function getEnumValue(enumType, rawValue) {
	var enumValues = enumType.children.reduce(function(enums, val) {
		enums[val.id] = val.name
		return enums
	}, {})
	return enumValues[rawValue]
}
