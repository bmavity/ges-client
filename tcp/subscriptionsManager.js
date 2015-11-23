var uuid = require('node-uuid')
	, subscriptionOperation = require('./operations/subscriptionOperation')
	, getIsoDate = require('./getIsoDate')
	, dateDiff = require('./isoDateDiff')
	, ensure = require('../ensure')
	, defaultSettings = {
			failOnNoServerResponse: false
		, operationTimeout: 10000
		, log: {
				error: console.error.bind(console)
			}
		}

module.exports = SubscriptionsManager
module.exports.item = SubscriptionItem

function LogDebug(msg) {
	console.log(msg)
}

function SubscriptionsManager(connectionName, connectionSettings) {
	if(!(this instanceof SubscriptionsManager)) {
		return new SubscriptionsManager(connectionSettings)
	}

	this._activeSubscriptions = {}
	this._waitingSubscriptions = []
	this._retryPendingSubscriptions = []

	Object.defineProperty(this, '_connectionName', { value: connectionName || uuid.v4() })
	Object.defineProperty(this, '_settings', { value: connectionSettings || defaultSettings })
}

SubscriptionsManager.prototype._getActive = function() {
	var me = this
	return Object.keys(this._activeSubscriptions).map(function(id) {
		return me._activeSubscriptions[id]
	})
}

SubscriptionsManager.prototype.checkTimeoutsAndRetry = function(tcpConnection) {
	ensure.exists(tcpConnection)

	var retrySubscriptions = []
		, removeSubscriptions = []
		, me = this

		this._getActive().forEach(function(subscriptionItem) {
		if(subscriptionItem.isSubscribed) return
		if(subscriptionItem.connectionId !== tcpConnection.connectionId) {
			retrySubscriptions.push(subscriptionItem)
		} else if(subscriptionItem.timeout > 0 && dateDiff.fromNow(subscriptionItem.lastUpdated) > me.operationTimeout) {
			var message = 'EventStoreConnection "' + me._connectionName
									+ '": subscription never got confirmation from server.\n'
									+ 'UTC now: ' + getIsoDate()
									+ ', operation: ' + subscriptionItem.toString()
									+ '.'
			me._settings.log.error(message)
			if(me._settings.failOnNoServerResponse) {
				subscriptionItem.operation.dropSubscription(subscriptionOperation.dropReason.SubscribingError
			 	, new Error('Operation Timeout: ' + message)
				)
				removeSubscriptions.push(subscriptionItem)
			} else {
				retrySubscriptions.push(subscriptionItem)
			}
		}
	})

	retrySubscriptions.forEach(function(subscriptionItem) {
		me.scheduleSubscriptionRetry(subscriptionItem)
	})

	removeSubscriptions.forEach(function(subscriptionItem) {
		me.removeSubscription(subscriptionItem)
	})

	this._retryPendingSubscriptions.forEach(function(subscriptionItem) {
		subscriptionItem.retryCount += 1
		me.startSubscription(subscriptionItem, tcpConnection)
	})
	this._retryPendingSubscriptions = []

  while(this._waitingSubscriptions.length) {
    this.startSubscription(this._waitingSubscriptions.shift(), connection)
  }
}

SubscriptionsManager.prototype.cleanUp = function() {
	var err = new Error('Connection "' + this._connectionName + '" was closed.')
		, me = this
		, allSubs = this._getActive()
				.concat(this._waitingSubscriptions)
				.concat(this._retryPendingSubscriptions)

	allSubs.forEach(function(subscriptionItem) {
		subscriptionItem.operation.dropSubscription(subscriptionOperation.dropReason.ConnectionClosed, err)
	})

  this._activeSubscriptions = {}
  this._waitingSubscriptions = []
  this._retryPendingSubscriptions = []
}

SubscriptionsManager.prototype.enqueueSubscription = function(subscriptionItem) {
	this._waitingSubscriptions.enqueue(subscriptionItem)
}

SubscriptionsManager.prototype.getActiveSubscription = function(correlationId) {
	return this._activeSubscriptions[correlationId]
}

SubscriptionsManager.prototype.purgeSubscribedAndDroppedSubscriptions = function(connectionId) {
  var activeSubscriptions = this._activeSubscriptions

	this._getActive().filter(function(subscriptionItem) {
		return subscriptionItem.isSubscribed && subscriptionItem.connectionId === connectionId
	}).forEach(function(subscriptionItem) {
		subscription.operation.connectionClosed()
		delete activeSubscriptions[subscriptionItem.correlationId]
	})
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

SubscriptionsManager.prototype.scheduleSubscriptionRetry = function(subscriptionItem) {
	if(!this.removeSubscription(subscriptionItem)) {
		LogDebug('Remove subscription failed when trying to retry ' + subscriptionItem.toString())
		return
	}

	if(subscriptionItem.maxRetries > 0 && subscriptionItem.retryCount >= subscriptionItem.maxRetries) {
		LogDebug('RETRIES LIMIT REACHED when trying to retry ' + subscriptionItem.toString() + '.')
		subscriptionItem.operation.dropSubscription(subscriptionOperation.dropReason.SubscribingError
		, new Error('Retry Limit Reached (retry count: ' + subscriptionItem.retryCount + ') ' + subscriptionItem.toString())
		)
	}

  LogDebug('Retrying subscription ' + subscriptionItem.toString() + '.')
  this._retryPendingSubscriptions.push(subscriptionItem)
}

SubscriptionsManager.prototype.startSubscription = function(subscriptionItem, tcpConnection) {
  if(subscriptionItem.isSubscribed) {
    LogDebug('StartSubscription REMOVING due to already subscribed ' + subscriptionItem.toString() + '.')
    this.removeSubscription(subscriptionItem)
    return
  }

  subscriptionItem.correlationId = uuid.v4()
  subscriptionItem.connectionId = tcpConnection.connectionId
  subscriptionItem.lastUpdated = getIsoDate()

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

	Object.defineProperty(this, 'createdTime', { value: getIsoDate() })

	this.connectionId = null
	this.isSubscribed = false
	this.lastUpdated = getIsoDate()
	this.retryCount = 0
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
