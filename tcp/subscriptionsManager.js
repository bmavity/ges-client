var uuid = require('node-uuid')
	, subscriptionOperation = require('./operations/subscriptionOperation')

module.exports = SubscriptionsManager
module.exports.item = SubscriptionItem

function LogDebug(msg) {
	//console.log(msg)
}

function SubscriptionsManager() {
	if(!(this instanceof SubscriptionsManager)) {
		return new SubscriptionsManager()
	}

	this._activeSubscriptions = {}
	this._waitingSubscriptions = []
}

SubscriptionsManager.prototype.cleanUp = function() {
	console.log('CLEANING UP SUBS')
}

SubscriptionsManager.prototype.enqueueSubscription = function(subscription) {
	this._waitingSubscriptions.push(subscription)
}

SubscriptionsManager.prototype.getActiveSubscription = function(correlationId) {
	return this._activeSubscriptions[correlationId]
}

SubscriptionsManager.prototype.removeSubscription = function(subscriptionItem) {
	var correlationId = subscriptionItem.correlationId
		, activeSubscription = this._activeSubscriptions[correlationId]
	if(!activeSubscription) {
    LogDebug('RemoveSubscription FAILED for ' + subscriptionItem.toString())
    return false
  }
  delete this._activeSubscriptions[correlationId]

  LogDebug('RemoveSubscription SUCCEEDED for ', subscriptionItem.toString())

  return true
}

SubscriptionsManager.prototype.scheduleSubscription = function(subscriptionData, tcpConnection) {
	var correlationId = uuid.v4()
		, subscription = subscriptionOperation(correlationId, subscriptionData, tcpConnection)

	this._activeSubscriptions[correlationId] = subscription

	tcpConnection.enqueueSend(subscription.toTcpMessage())
}

SubscriptionsManager.prototype.startSubscription = function(subscriptionItem, tcpConnection) {
  if(subscriptionItem.isSubscribed) {
    LogDebug('StartSubscription REMOVING due to already subscribed ' + subscriptionItem.toString() + '.')
    this.removeSubscription(subscriptionItem)
    return
  }

  subscriptionItem.correlationId = uuid.v4()
  subscriptionItem.connectionId = tcpConnection.connectionId
  subscriptionItem.lastUpdated = new Date().toISOString()

  this._activeSubscriptions[subscriptionItem.correlationId] = subscriptionItem

  if(!subscriptionItem.operation.subscribe(subscriptionItem.correlationId, tcpConnection)) {
    LogDebug("StartSubscription REMOVING AS COULDN'T SUBSCRIBE "  + subscriptionItem.toString() + '.')
    this.removeSubscription(subscriptionItem)
  } else {
    LogDebug('StartSubscription SUBSCRIBING ' + subscriptionItem.toString() + '.')
  }
}




function SubscriptionItem(operation, maxRetries, timeout) {
	if(!(this instanceof SubscriptionItem)) {
		return new SubscriptionItem(operation, maxRetries, timeout)
	}

	Object.defineProperty(this, 'correlationId', { value: uuid.v4() })
	Object.defineProperty(this, 'operation', { value: operation })
	Object.defineProperty(this, 'maxRetries', { value: maxRetries })
	Object.defineProperty(this, 'timeout', { value: timeout })

	Object.defineProperty(this, 'createdTime', { value: new Date().toISOString() })
	Object.defineProperty(this, 'retryCount', { value: 0 })
	Object.defineProperty(this, 'lastUpdated', { value: new Date().toISOString() })

	this.isSubscribed = false
	this.connectionId = null
}

SubscriptionItem.prototype.toString = function() {
	return 'Subscription ' + this.operation.type
			+ '(' + this.correlationId
			+ '): ' + this.operation.toString()
			+ ', is subscribed: ' + this.isSubscribed
			+ ', retry count: ' + this.retryCount
			+ ', created: ' + this.createdTime
			+ ', last updated: ' + this.lastUpdated
}
