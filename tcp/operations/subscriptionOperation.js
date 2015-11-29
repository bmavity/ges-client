var util = require('util')
	, EventEmitter = require('events').EventEmitter
	, parser = require('../messageParser')
	, eventPayloads = require('../eventPayloads')
	, position = require('../position')
	, ensure = require('../../ensure')
	, inspection = require('./inspection')
	, dropReason = Object.create(Object.prototype, {
			UserInitiated: { value: 0 }
		, NotAuthenticated: { value: 1 }
		, AccessDenied: { value: 2 }
		, SubscribingError: { value: 3 }
		, ServerError: { value: 4 }
		, ConnectionClosed: { value: 5 }
		, CatchUpError: { value: 6 }
		, ProcessingQueueOverflow: { value: 7 }
		, EventHandlerException: { value: 8 }
		, Unknown: { value: 100 }
		})

function LogDebug(msg) {
	console.log(msg)
}

module.exports = SubscriptionOperation
Object.defineProperty(module.exports, 'dropReason', { value: dropReason })

/*
	subscription.on('unsubscribe requested', function() {
		//BLM: Locate root cause here
		if(!connection._socket.writable) return

		connection.enqueueSend({
			messageName: 'UnsubscribeFromStream'
		, correlationId: correlationId
		})
	})
*/

function SubscriptionOperation(subscriptionData, getConnection) {
	if(!(this instanceof SubscriptionOperation)) {
		return new SubscriptionOperation(subscriptionData, getConnection)
	}
	EventEmitter.call(this)

	ensure.exists(subscriptionData.subscription, 'subscription')
	ensure.exists(getConnection, 'getConnection')

	var subscription = subscriptionData.subscription
		, stream = subscription.stream
	if(!stream) {
		stream = ''
	}

	Object.defineProperty(this, 'type', { value: 'SubscriptionOperation' })

	Object.defineProperty(this, '_stream', { value: stream })
	Object.defineProperty(this, 'userCredentials', { value: subscription.auth })

	Object.defineProperty(this, '_resolveLinkTos', { value: !!subscription.data.resolveLinkTos })

	Object.defineProperty(this, '_log', { value: { debug: LogDebug } })
	Object.defineProperty(this, '_verboseLogging', { value: null })
	Object.defineProperty(this, '_getConnection', { value: getConnection })


	this._subscription = subscription.subscription
	this._unsubscribed = false

	var me = this
	this._subscription.on('unsubscribe requested', function() {
		me.unsubscribe()
	})
}
util.inherits(SubscriptionOperation, EventEmitter)

SubscriptionOperation.prototype.createSubscriptionPackage = function() {
	var name = 'SubscribeToStream'
		, payload = parser.serialize(name, {
									eventStreamId: this._stream
								, resolveLinkTos: this._resolveLinkTos
								})
	return {
		messageName: name
	, correlationId: this._correlationId
	, payload: payload
	, auth: this.userCredentials
	}
}

SubscriptionOperation.prototype.confirmSubscription = function(lastCommitPosition, lastEventNumber) {
	if(lastCommitPosition < -1) {
    throw new Error('Invalid lastCommitPosition ' + lastCommitPosition + ' on subscription confirmation.')
	}

	/* Awaiting subscription decision
  if(this._subscription !== null) {
    throw new Error('Double confirmation of subscription.')
  }
  */
  if(this._verboseLogging) {
  	/*
    _log.Debug("Subscription {0:B} to {1}: subscribed at CommitPosition: {2}, EventNumber: {3}.",
       _correlationId, _streamId == string.Empty ? "<all>" : _streamId, lastCommitPosition, lastEventNumber)
		*/
  }

  // TODO: Decide if subscription should be passed in callback (likely yes)
  //this._subscription = new EventStoreSubscription(Unsubscribe, _streamId, lastCommitPosition, lastEventNumber)
  //this._source.SetResult(_subscription)
}

SubscriptionOperation.prototype.connectionClosed = function() {
  this.dropSubscription(dropReason.ConnectionClosed, new Error('Connection was closed.'))
}

SubscriptionOperation.prototype.dropSubscription = function(reason, err) {
	/*
	if (Interlocked.CompareExchange(ref _unsubscribed, 1, 0) == 0)
            {
                if (_verboseLogging)
                    _log.Debug("Subscription {0:B} to {1}: closing subscription, reason: {2}, exception: {3}...",
                               _correlationId, _streamId == string.Empty ? "<all>" : _streamId, reason, exc);

                if (reason != SubscriptionDropReason.UserInitiated)
                {
                    if (exc == null) throw new Exception(string.Format("No exception provided for subscription drop reason '{0}", reason));
                    _source.TrySetException(exc);
                }

                if (reason == SubscriptionDropReason.UserInitiated && _subscription != null && connection != null)
                    connection.EnqueueSend(CreateUnsubscriptionPackage());

                if (_subscription != null)
                    ExecuteActionAsync(() => _subscriptionDropped(_subscription, reason, exc));
            }
            */
  if(!this._unsubscribed) {
  	this._unsubscribed = true

	  this._subscription.emit('dropped', {
	  	reason: reason
	  , err: err
	  })
  }
}

SubscriptionOperation.prototype.eventAppeared = function(resolvedEvent) {
	if(this._unsubscribed) return

  if(this._subscription === null) {
  	throw new Error('Subscription not confirmed, but event appeared!')
  }

  if(this._verboseLogging) {
  	/*
    _log.Debug("Subscription {0:B} to {1}: event appeared ({2}, {3}, {4} @ {5}).",
              _correlationId, _streamId == string.Empty ? "<all>" : _streamId,
              e.OriginalStreamId, e.OriginalEventNumber, e.OriginalEvent.EventType, e.OriginalPosition);
*/
  }

  this._subscription.emit('event', resolvedEvent)
}

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

SubscriptionOperation.prototype.inspectPackage = function(package) {
  if(package.messageName === 'NotAuthenticated') return this.inspectNotAuthenticated(package)
  if(package.messageName === 'BadRequest') return this.inspectBadRequest(package)
  if(package.messageName === 'NotHandled') return this.inspectNotHandled(package)

	var inspector = packageInspectors[package.messageName]
	if(!inspector) {
		this.dropSubscription('ServerError', new Error('Unexpected Command: ' + package.messageName));
    return inspection(inspection.decision.EndOperation, package.messageName)
	}

	try {
		var payload = parser.parse(inspector.responseType, package.payload)
		return inspector.inspect.call(this, payload, this._subscription)
  }
  catch(err) {
    this.dropSubscription('Unknown', err)
    return inspection(inspection.decision.EndOperation, 'Exception - ' + err.message)
  }
}

SubscriptionOperation.prototype.inspectNotAuthenticated = function(package) {
	var message = package.payload.toString('UTF8') || 'Authentication error'
  this.dropSubscription('NotAuthenticated', new Error('Not Authenticated [ ' + message + ' ]'))
  return new inspection(inspection.decision.EndOperation, 'NotAuthenticated')
}

SubscriptionOperation.prototype.inspectBadRequest = function(package) {
	var message = package.payload.toString('UTF8') || '<no message>'
  this.dropSubscription('ServerError', new Error('Server Error [ ' + message + ' ]'))
  return new inspection(inspection.decision.EndOperation, 'BadRequest: ' + message)
}

SubscriptionOperation.prototype.inspectNotHandled = function(package) {
	/* BLM: Decide with subscriptiobn callback decision
	if (_subscription != null)
        throw new Exception("NotHandled command appeared while we already subscribed.");
  */
	var message = messageParser.parse('NotHandled', package.payload)
	switch(message.reason) {
		case notHandledReason.NotReady:
			return new inspection(inspection.decision.Retry, 'NotHandled - NotReady')
			break
		case notHandledReason.TooBusy:
			return new inspection(inspection.decision.Retry, 'NotHandled - TooBusy')
			break
		case notHandledReason.NotMaster:
			var masterInfo = messageParser.parse('NotHandled.MasterInfo', message.masterInfo)
			return new inspection(inspection.decision.Reconnect, 'NotHandled - NotMaster'
			, masterInfo.externalTcpEndPoint
			, masterInfo.externalSecureTcpEndPoint
			)
			break
		default:
			LogDebug('Unknown NotHandledReason: ' + message.reason + '.')
			return new inspection(inspection.decision.Retry, 'NotHandled - <unknown>')
	}
}

SubscriptionOperation.prototype.subscribe = function(correlationId, tcpConnection) {
	ensure.exists(tcpConnection, 'tcpConnection')

	//TODO: Fix this after Subscription decision
	/*
	if(this._subscription !== null || this._unsubscribed) {
    return false
	}
	*/
	if(this._unsubscribed) {
    return false
	}

  this._correlationId = correlationId
  tcpConnection.enqueueSend(this.createSubscriptionPackage())
  return true
}

SubscriptionOperation.prototype.unsubscribe = function() {
	this.dropSubscription('UserInitiated', null, this._getConnection());
}


var packageInspectors = {
  SubscriptionConfirmation: {
  	responseType: 'SubscriptionConfirmation'
  , inspect: function(payload, subscription) {
      this.confirmSubscription(payload.lastCommitPosition, payload.lastEventNumber)
			subscription.emit('confirmed', {
				lastCommitPosition: payload.lastCommitPosition
			, lastEventNumber: payload.lastEventNumber
			})
      return inspection(inspection.decision.Subscribed, 'SubscriptionConfirmation')
	  }
	}
, SubscriptionDropped: {
  	responseType: 'SubscriptionDropped'
  , inspect: function(payload, subscription) {
  		console.log('sub dropped: ', payload, payload.reason)

  		switch(payload.reason) {
  			case dropReason.Unsubscribed:
		  		this.dropSubscription(dropReason.UserInitiated, null)
  				break
  			case dropReason.AccessDenied:
  				var stream = this._stream || '<all>' 
  					, err = new Error('Subscription to "' + stream + '" failed due to access denied.')
		  		this.dropSubscription(dropReason.AccessDenied, null)
  				break
  			default:
  				if(this._verboseLogging) {
  					this._log.debug('Subscription dropped by server. Reason: ' + payload.reason + '.')
  				}
  				var err = new Error('Command Not Expected [ Unsubscribe reason: "' + payload.reason + '" ]')
		  		this.dropSubscription(dropReason.Unknown, err)
  		}

      return inspection(inspection.decision.EndOperation, 'SubscriptionDropped' + payload.reason)
	  }
	}
, StreamEventAppeared: {
  	responseType: 'StreamEventAppeared'
  , inspect: function(payload, subscription) {
      this.eventAppeared(eventPayloads.toResolvedEvent(payload.event))

      return inspection(inspection.decision.DoNothing, 'StreamEventAppeared')
	  }
	}
}

var responseHandlers = {
  'SubscriptionConfirmation': {
  	responseType: 'SubscriptionConfirmation'
  , processResponse: function(payload, subscription) {
			subscription.emit('confirmed', {
				lastCommitPosition: payload.lastCommitPosition
			, lastEventNumber: payload.lastEventNumber
			})
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
