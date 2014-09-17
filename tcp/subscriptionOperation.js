var util = require('util')
	, EventEmitter = require('events').EventEmitter
	, parser = require('./messageParser')

module.exports = SubscriptionOperation


function SubscriptionOperation(correlationId, subscriptionData, connection) {
	if(!(this instanceof SubscriptionOperation)) {
		return new SubscriptionOperation(correlationId, subscriptionData, connection)
	}

	EventEmitter.call(this)
	var subscription = subscriptionData.subscription

	subscription.on('unsubscribe requested', function() {
		connection.enqueueSend({
			messageName: 'UnsubscribeFromStream'
		, correlationId: correlationId
		})
	})

	this._correlationId = correlationId
	this._subscription = subscription
	this._data = subscriptionData
}
util.inherits(SubscriptionOperation, EventEmitter)

SubscriptionOperation.prototype.dropped = function() {
	this._subscription.emit('dropped')
}

SubscriptionOperation.prototype.eventAppeared = function(evt) {
	this._subscription.emit('event', evt)
}

SubscriptionOperation.prototype.toTcpMessage = function() {
	var name = 'SubscribeToStream'
		, payload = parser.serialize(name, {
									eventStreamId: this._data.stream || ''
								, resolveLinkTos: !!this._data.data.resolveLinkTos
								})
	return {
		messageName: name
	, correlationId: this._correlationId
	, payload: payload
	, auth: this._data.auth
	}
}
