var ensure = require('../ensure')

module.exports = SimpleQueuedHandler


function SimpleQueuedHandler() {
	if(!(this instanceof SimpleQueuedHandler)) {
		return new SimpleQueuedHandler()
	}

	this._handlers = {}
	this._queuedEvents = []
}

SimpleQueuedHandler.prototype.enqueueMessage = function(message) {
	ensure.exists(message, 'message')

	this._queuedEvents.push(message)
}

SimpleQueuedHandler.prototype.registerHandler = function(messageType, handler) {
	ensure.exists(messageType, 'messageType')
	ensure.isFn(handler, 'handler')

	if(this._handlers.hasOwnProperty(messageType)) {
		throw new Error('Cannot have multiple handlers for message ' + messageType)
	}

	this._handlers[messageType] = handler
}

