var util = require('util')
	, EventEmitter = require('events').EventEmitter

module.exports = SubscriptionOperation


function SubscriptionOperation(correlationId, subscription, connection) {
	if(!(this instanceof SubscriptionOperation)) {
		return new SubscriptionOperation(correlationId, subscription, connection)
	}

	EventEmitter.call(this)

	subscription.on('unsubscribe requested', function() {
		connection.enqueueSend({
			messageName: 'UnsubscribeFromStream'
		, correlationId: correlationId
		})
	})

	this._subscription = subscription
}
util.inherits(SubscriptionOperation, EventEmitter)

SubscriptionOperation.prototype.dropped = function() {
	this._subscription.emit('dropped')
}

SubscriptionOperation.prototype.eventAppeared = function(evt) {
	this._subscription.emit('event', evt)
}
