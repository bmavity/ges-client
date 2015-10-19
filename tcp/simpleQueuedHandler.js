var ensure = require('../ensure')

module.exports = SimpleQueuedHandler


function SimpleQueuedHandler() {
	if(!(this instanceof SimpleQueuedHandler)) {
		return new SimpleQueuedHandler()
	}

	this._handlers = {}
	this._queuedMessages = []

	this._isProcessing = false
}

SimpleQueuedHandler.prototype.enqueueMessage = function(message) {
	ensure.exists(message, 'message')

	this._queuedMessages.push(message)

	if(!this._isProcessing) {
		this._isProcessing = true
		this._processQueue()
	}
}

SimpleQueuedHandler.prototype.registerHandler = function(messageType, handler) {
	ensure.exists(messageType, 'messageType')
	ensure.isFn(handler, 'handler')

	if(this._handlers.hasOwnProperty(messageType)) {
		throw new Error('Cannot have multiple handlers for message ' + messageType)
	}

	this._handlers[messageType] = handler
}

SimpleQueuedHandler.prototype._processQueue = function() {
	do {
		var nextMessage = this._queuedMessages.shift()
			, handler = this._handlers[nextMessage.type]

		if(!handler) {
			throw new Error('No handler registered for message ' + nextMessage.type)
		}

		handler.call(null, nextMessage.payload)

		this._isProcessing = false
	}
	while(this._queuedMessages.length > 0 && !this._isProcessing)
}
