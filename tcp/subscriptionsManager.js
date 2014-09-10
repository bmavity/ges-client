var uuid = require('node-uuid')
	, parser = require('./messageParser')
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

SubscriptionsManager.prototype.scheduleSubscription = function(subscriptionItem, tcpConnection) {
	var correlationId = uuid.v4()
		, subscriptionName = subscriptionItem.name
		, auth = null

	this._activeSubscriptions[correlationId] = {
		subscription: subscriptionOperation(correlationId, subscriptionItem.subscription, tcpConnection)
	, item: subscriptionItem
	}

	var payload = parser.serialize(subscriptionName, subscriptionItem.data)

	tcpConnection.enqueueSend({
		messageName: subscriptionName
	, correlationId: correlationId
	, payload: payload
	, auth: auth
	})
}
