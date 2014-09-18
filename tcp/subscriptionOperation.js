var util = require('util')
	, EventEmitter = require('events').EventEmitter
	, parser = require('./messageParser')
	, eventPayloads = require('./eventPayloads')
	, position = require('./position')

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

SubscriptionOperation.prototype.finish = function(message) {
	var handler = responseHandlers[message.messageName]
	try {
		var payload = parser.parse(handler.responseType, message.payload)
	}
	catch(ex) {
		this._subscription.emit('error', ex)
	}

	handler.processResponse(payload, this._subscription)
}

SubscriptionOperation.prototype.toTcpMessage = function() {
	var name = 'SubscribeToStream'
		, payload = parser.serialize(name, {
									eventStreamId: this._data.stream
								, resolveLinkTos: !!this._data.data.resolveLinkTos
								})
	return {
		messageName: name
	, correlationId: this._correlationId
	, payload: payload
	, auth: this._data.auth
	}
}

var responseHandlers = {
  'SubscriptionConfirmation': {
  	responseType: 'SubscriptionConfirmation'
  , processResponse: function(payload, subscription) {
			subscription.emit('confirmed', position(payload))
	  }
	}
, 'StreamEventAppeared': {
  	responseType: 'StreamEventAppeared'
  , processResponse: function(payload, subscription) {
			subscription.emit('event', eventPayloads.toResolvedEvent(payload.event))
	  }
	}
, 'SubscriptionDropped': {
  	responseType: 'SubscriptionDropped'
  , processResponse: function(payload, subscription) {
  		subscription.emit('dropped', {
  			reason: payload.reason
  		, error: null
  		})
	  }
	}
}
