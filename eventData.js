var is = require('is')

module.exports = function EventData(eventId, type, isJson, data, metadata) {
	if(!(this instanceof EventData)) {
		return new EventData(eventId, type, isJson, data, metadata)
	}

	isJson = !!isJson

	if(!Buffer.isBuffer(data)) {
		data = bufferize(isJson, data)
	}

	if(!Buffer.isBuffer(metadata)) {
		metadata = bufferize(isJson, metadata)
	}
	
	Object.defineProperties(this, {
		EventId: { value: eventId, enumerable: true }
  , Type: { value: type, enumerable: true }
  , IsJson: { value: isJson, enumerable: true }
  , Data: { value: data, enumerable: true }
  , Metadata: { value: metadata, enumerable: true }
	})
}


function bufferize(isJson, data) {
	if(is['undefined'](data) || is['null'](data)) {
		return new Buffer(0)
	}

	if(isJson && is.object(data)) {
		return JSON.stringify(data)
	}

	if(is.object(data)) {
		throw new Error('Cannot automatically create data or metadata Buffer for a non-json object, please supply the raw Buffer to the createEventData method instead or set isJson to true')
	}

	if(!is.string(data)) {
		throw new Error('Cannot automatically create data or metadata Buffer for a non-string, please supply the raw Buffer to the createEventData method instead')
	}

	return new Buffer(data)
}
