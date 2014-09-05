module.exports = function EventData(eventId, type, isJson, data, metadata) {
	if(!(this instanceof EventData)) {
		return new EventData(eventId, type, isJson, data, metadata)
	}

	isJson = !!isJson
	data = data || new Buffer(0)
	metadata = metadata || new Buffer(0)
	
	Object.defineProperties(this, {
		EventId: { value: eventId }
  , Type: { value: type }
  , IsJson: { value: isJson }
  , Data: { value: data }
  , Metadata: { value: metadata }
	})
}