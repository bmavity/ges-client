var uuid = require('node-uuid')
	, subscriptionOperation = require('./subscriptionOperation')

module.exports = SubscriptionsManager


function SubscriptionsManager() {
	if(!(this instanceof SubscriptionsManager)) {
		return new SubscriptionsManager()
	}

	this._activeSubscriptions = {}
	this._waitingSubscriptions = []
}

SubscriptionsManager.prototype.enqueueSubscription = function(subscription) {
	this._waitingSubscriptions.push(subscription)
}

SubscriptionsManager.prototype.getActiveSubscription = function(correlationId) {
	return this._activeSubscriptions[correlationId]
}

SubscriptionsManager.prototype.scheduleSubscription = function(subscriptionData, tcpConnection) {
	var correlationId = uuid.v4()
		, subscription = subscriptionOperation(correlationId, subscriptionData, tcpConnection)

	this._activeSubscriptions[correlationId] = subscription

	tcpConnection.enqueueSend(subscription.toTcpMessage())
}

