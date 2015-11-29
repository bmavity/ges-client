var tcpPackageConnection = require('./tcpPackageConnection')
	, operationsManager = require('./operationsManager')
	, operations = require ('./operations')
	, inspection = operations.inspection
	, subscriptionsManager = require('./subscriptionsManager')
	, subscriptionOperation = require('./operations/subscriptionOperation')
	, createQueue = require('./simpleQueuedHandler')
	, messages = require('./messages')
	, ensure = require('../ensure')
	, util = require('util')
	, EventEmitter = require('events').EventEmitter
	, uuid = require('node-uuid')
	, getIsoDate = require('./getIsoDate')
	, dateDiff = require('./isoDateDiff')


function LogDebug(message) {
	//console.log(message)
}

function LogInfo(message) {
	//console.log(message)
}

module.exports = EsConnectionLogicHandler


function noOp(message, cb) {
	cb && cb(null)
}	

function EsConnectionLogicHandler(esConnection, connectionSettings) {
	if(!(this instanceof EsConnectionLogicHandler)) {
		return new EsConnectionLogicHandler(esConnection, connectionSettings)
	}

	EventEmitter.call(this)

	var me = this

	this._queue = createQueue()

	this._queue.registerHandler('StartConnection', function(msg) { me._startConnection(msg.endpointDiscoverer, msg.cb) })
	this._queue.registerHandler('CloseConnection', function(msg) { me._closeConnection(msg.reason, msg.exception) })

	this._queue.registerHandler('StartOperation', function(msg) {
		me._startOperation(msg.operation, msg.maxRetries, msg.timeout)
	})
	this._queue.registerHandler('StartSubscription', function(msg) { me._startSubscription(msg) })

	this._queue.registerHandler('EstablishTcpConnection', function(msg) { me._establishTcpConnection(msg.endpoints) })
	this._queue.registerHandler('TcpConnectionEstablished', function(msg) { me._tcpConnectionEstablished(msg.connection) })
	this._queue.registerHandler('TcpConnectionError', function(msg) { 
		me._tcpConnectionError(msg.connection, msg.exception)
	})
	this._queue.registerHandler('TcpConnectionClosed', function(msg) { me._tcpConnectionClosed(msg.connection) })
	this._queue.registerHandler('HandleTcpPackage', function(msg) { me._handleTcpPackage(msg.connection, msg.package) })

	this._queue.registerHandler('TimerTick', function(msg) { me._timerTick() })

	Object.defineProperty(this, '_settings', { value: connectionSettings })

	this._handlers = {}

	this._esConnection = esConnection
	this._tcpConnection = null
	this._endPoint = null
	this._state = null

	this._queuedMessages = []
	this._operations = operationsManager(this._esConnection.connectionName, this._settings)
	this._subscriptions = subscriptionsManager()

	this._tcpConnectionState = 'Init'
	this._connectingPhase = connectingPhase.Invalid
	this._wasConnected = false
	this._packageNumber = 0
	this._lastTimeoutsTimeStamp = getIsoDate()


	this._timer = setInterval(function() {
		me.enqueueMessage({
			type: 'TimerTick'
		})
	}, 200)
}
util.inherits(EsConnectionLogicHandler, EventEmitter)


EsConnectionLogicHandler.prototype.enqueueMessage = function(message) {
	this._queue.enqueueMessage(message)
}

EsConnectionLogicHandler.prototype.isInState = function(state) {
	return this._tcpConnectionState === state
}

EsConnectionLogicHandler.prototype._closeConnection = function(reason, exception) {
	LogDebug('In close connection handler')
	this._getStateMessageHandler(closeConnectionHandlers)
		.call(this, reason, exception)
}

EsConnectionLogicHandler.prototype._closeTcpConnection = function(reason) {
	if(this._tcpConnection === null) {
    LogDebug('CloseTcpConnection IGNORED because _tcpConnection is null');
    return
  }

  LogDebug('CloseTcpConnection')

	var me = this

	this._tcpConnection.close(reason, function(err) {
		me._tcpConnectionClosed(me._tcpConnection)
		me._tcpConnection.cleanup()
		me._tcpConnection = null
	})
}

EsConnectionLogicHandler.prototype._discoverEndpoint = function(cb) {
	cb = cb || noOp

	if(this._tcpConnectionState !== 'Connecting') return cb()
	if(this._connectingPhase !== connectingPhase.Reconnecting) return cb()

	this._connectingPhase = connectingPhase.EndpointDiscovery
	
	var existingEndpoint = this._tcpConnection !== null ? this._tcpConnection.remoteEndpoint : null
		, me = this

	this._endpointDiscoverer.discover(existingEndpoint, function(err, endpoint) {
		if(err) {
			me.enqueueMessage(messages.closeConnection('Failed to resolve TCP endpoint', err))
			var error = new Error("Couldn't resolve target endpoint.")
			error.inner = err
			cb(error)
		} else {
			me.enqueueMessage(messages.establishTcpConnection(endpoint))
			cb()
		}
	})
}

EsConnectionLogicHandler.prototype._establishTcpConnection = function(endpoints) {
	var endpoint = endpoints.tcpEndpoint
	if(endpoint === null) {
		this._closeConnection('No endpoint to node specified.')
		return
	}

	LogDebug('EstablishTcpConnection to [' + endpoint.host + ':' + endpoint.port + ']')

	if(this._tcpConnectionState !== 'Connecting') return
	if(this._connectingPhase !== connectingPhase.EndpointDiscovery) return

	this._connectingPhase = connectingPhase.ConnectionEstablishing

	var me = this
		, tcpConnection = tcpPackageConnection({
				connectionId: uuid.v4()
			, endPoint: endpoint
			})

	tcpConnection.on('connect', function() {
		me.enqueueMessage(messages.tcpConnectionEstablished(tcpConnection))
	})

	tcpConnection.on('package', function(data) {
		me.enqueueMessage(messages.handleTcpPackage(data.connection, data.package))
	})

	tcpConnection.on('error', function(err) {
		me.enqueueMessage(messages.tcpConnectionError(tcpConnection, err))
	})

	tcpConnection.on('close', function() {
		console.log("CALLING THIS NOW")
		me.enqueueMessage(messages.tcpConnectionClosed(tcpConnection))
	})

	this._tcpConnection = tcpConnection
}

EsConnectionLogicHandler.prototype._getStateMessageHandler = function(stateMessages) {
	ensure.exists(stateMessages, 'stateMessages')

	var handler = stateMessages[this._tcpConnectionState]
	if(!handler) {
		throw new Error('Unknown stage: ' + this._tcpConnectionState)
	}
	return handler
}

EsConnectionLogicHandler.prototype._handleTcpPackage = function(connection, package) {
	this._getStateMessageHandler(handleTcpPackageHandlers)
		.call(this, connection, package)
}

EsConnectionLogicHandler.prototype._goToConnectedState = function() {
	ensure.exists(this._tcpConnection, 'connection');

  this._tcpConnectionState = 'Connected'
  this._connectingPhase = connectingPhase.Connected

  this._wasConnected = true

  this.emit('connect', this._tcpConnection.remoteEndpoint)

  if(dateDiff.fromNow(this._lastTimeoutsTimeStamp) >= this._settings.operationTimeoutCheckPeriod) {
    this._operations.checkTimeoutsAndRetry(this._tcpConnection)
    this._subscriptions.checkTimeoutsAndRetry(this._tcpConnection)
    this._lastTimeoutsTimeStamp = getIsoDate()
  }
}

EsConnectionLogicHandler.prototype._isInPhase = function(connectingPhase) {
	return this._connectingPhase === connectingPhase
}

EsConnectionLogicHandler.prototype._manageHeartbeats = function() {
	if(this._tcpConnection === null) throw new Error('Trying to process heartbeat message when connection is null.')

  var timeout = this._heartbeatInfo.isIntervalStage
				? this._settings.heartbeatInterval
				: this._settings.heartbeatTimeout
  if(dateDiff.fromNow(this._heartbeatInfo.timeStamp) < timeout) return

  var packageNumber = this._packageNumber
  if(this._heartbeatInfo.lastPackageNumber !== packageNumber) {
    this._heartbeatInfo = new HeartbeatInfo(packageNumber, true, getIsoDate())
    return
  }

  if(this._heartbeatInfo.isIntervalStage) {
    // TcpMessage.Heartbeat analog
    this._tcpConnection.enqueueSend({
			messageName: 'HeartbeatRequestCommand'
		, correlationId: uuid.v4()
		})
    this._heartbeatInfo = new HeartbeatInfo(this._heartbeatInfo.lastPackageNumber, false, getIsoDate())
  } else {
    var message = 'EventStoreConnection "' + this._esConnection.connectionName
    	+ '": closing TCP connection [' + this._tcpConnection.remoteEndpoint.toString()
    	+ ', ' + this._tcpConnection.localEndpoint.toString()
    	+ ', ' + this._tcpConnection.connectionId
    	+ '] due to HEARTBEAT TIMEOUT at pkgNum ' + packageNumber
    	+ '.'
    LogInfo(message)

    this._closeTcpConnection(message)
	} 
}

EsConnectionLogicHandler.prototype._raiseAuthenticationFailed = function(reason) {
	this.emit('authentication failed', {
		esConnection: this._esConnection
	, reason: reason
	})
}

EsConnectionLogicHandler.prototype._reconnectTo = function(endpoints) {
	var endpoint = this._settings.useSslConnection
				? endpoints.secureTcpEndpoint || endpoints.tcpEndpoint
				: endpoints.tcpEndpoint

	if(!endpoint) {
		this._closeConnection('No end point is specified while trying to reconnect.')
		return
	}

	if(this._tcpConnectionState !== 'Connecting' || this._tcpConnection.remoteEndpoint.equals(endpoint)) return

	var message = 'EventStoreConnection ' + this._esConnection.connectionName
				+ ': going to reconnect to [ ' + endpoint.toString()
				+ ' ]. Current endpoint: [ ' + this._tcpConnectionState.remoteEndpoint.toString()
				+ ', L' + this._tcpConnection.localEndpoint.toString()
				+ ' ].'

	if(this._settings.verboseLogging) {
		this._settings.Log.Info(message)
	}

	this._closeTcpConnection(message)

	this._tcpConnectionState = 'Connecting'
	this._connectingPhase = connectingPhase.EndPointDiscovery
	this._establishTcpConnection(endpoints)
}

EsConnectionLogicHandler.prototype._startConnection = function(endpointDiscoverer, cb) {
	this._getStateMessageHandler(startConnectionHandlers)
		.call(this, endpointDiscoverer, cb)
}

EsConnectionLogicHandler.prototype._startOperation = function(operation, maxRetries, timeout) {
	this._getStateMessageHandler(startOperationHandlers)
		.call(this, operation, maxRetries, timeout)
}

EsConnectionLogicHandler.prototype._startSubscription = function(message) {
	this._getStateMessageHandler(startSubscriptionHandlers).call(this, message)
}

EsConnectionLogicHandler.prototype._tcpConnectionClosed = function(tcpConnection) {
	if(this._tcpConnectionState === 'Init') throw new Error()
  if(this._tcpConnectionState === 'Closed' || this._tcpConnection !== tcpConnection) {
    LogDebug('IGNORED (_state: ' + this._tcpConnectionState
    	+ ', _conn.ID: ' + this._tcpConnection.connectionId
    	+ ', conn.ID: ' + tcpConnection.connectionId
    	+ '): TCP connection to [' + tcpConnection.remoteEndpoint.toString()
			+ ', L' + tcpConnection.localEndpoint.toString()
			+ '] closed.')
    return
  }

  this._tcpConnectionState = 'Connecting'
  this._connectingPhase = connectingPhase.Reconnecting

  LogDebug('TCP connection to [' + tcpConnection.remoteEndpoint.toString()
			+ ', L' + tcpConnection.localEndpoint.toString()
    	+ ', ' + tcpConnection.connectionId
			+ '] closed.')

  this._subscriptions.purgeSubscribedAndDroppedSubscriptions(this._tcpConnection.connectionId)
  this._reconnInfo = new ReconnectionInfo()

  if(this._wasConnected) {
  	this._wasConnected = false
    this.emit('disconnected', tcpConnection.remoteEndpoint)
  }
}

EsConnectionLogicHandler.prototype._tcpConnectionError = function(tcpConnection, err) {
	if(tcpConnection !== this._tcpConnection) return
  if(this._tcpConnectionState === 'Closed') return

  LogDebug('TcpConnectionError connId ' + tcpConnection.connectionId
  	+ ', exception ' + err.message
  	+ '.'
	)
  this._closeConnection('TCP connection error occurred.', err);
}

EsConnectionLogicHandler.prototype._tcpConnectionEstablished = function(tcpConnection) {
	if(this._tcpConnectionState !== 'Connecting' || this._tcpConnection !== tcpConnection || tcpConnection.isClosed) {
    LogDebug('IGNORED (_state ' + this._tcpConnectionState
    	+ ', _conn.Id ' + this._tcpConnection.connectionId
    	+ ', conn.Id ' + tcpConnection.connectionId
    	+ ', conn.closed ' + tcpConnection.IsClosed
    	+ '): TCP connection to [' + tcpConnection.remoteEndpoint.toString()
			+ ', L' + tcpConnection.localEndpoint.toString()
			+ '] established.'
		)
    return
  }

  LogDebug('TCP connection to [' + tcpConnection.remoteEndpoint.toString()
  	+ ', L' + tcpConnection.localEndpoint.toString()
  	+ ', ' + tcpConnection.connectionId
  	+ '] established.'
	)
  this._heartbeatInfo = new HeartbeatInfo(this._packageNumber, true, getIsoDate())

  if(this._settings.defaultUserCredentials) {
    this._connectingPhase = connectingPhase.Authentication;
    this._authInfo = new AuthInfo()

    this._tcpConnection.enqueueSend({
    	messageName: 'Authenticate'
  	, correlationId: this._authInfo.correlationId
  	, auth: this._settings.defaultUserCredentials
	  })
  } else {
    this._goToConnectedState();
  }
}

EsConnectionLogicHandler.prototype._timerTick = function() {
	this._getStateMessageHandler(timerTickHandlers).call(this)
}

var noOp = function() {}

var closeConnectionHandlers = {
			Init: performCloseConnection
		, Connecting: performCloseConnection
		, Connected: performCloseConnection
		, Closed: function(reason, err) {
				LogDebug('CloseConnection IGNORED because is ESConnection is CLOSED, reason ' + reason
					+ ', exception ' + (err && err.message) || err || '<no error>'
					+ '.')
			}
		}

function performCloseConnection(reason, err) {
	LogDebug('CloseConnection, reason ' + reason + ', exception ' + err + '.');

	this._tcpConnectionState = 'Closed'

	clearInterval(this._timer)
	this._operations.cleanUp()
	this._subscriptions.cleanUp()
	this._closeTcpConnection(reason)

	LogInfo('Closed. Reason: ' + reason + '.')

	if(err) {
		this.emit('error', err)
	}

	this._esConnection.emitClose(reason)
}

var handleTcpPackageHandlers = {
			Init: noOp
		, Connecting: handleTcpPackage
		, Connected: handleTcpPackage
		, Closed: noOp
		}

function handleTcpPackage(connection, package) {
	var handleMessage = 'HandleTcpPackage connId ' + this._tcpConnection.connectionId
    	+ ', package ' + package.messageName
    	+ ', ' + package.correlationId
    	+ '.'
	if(this._tcpConnection !== connection || this._tcpConnectionState === 'Closed' || this._tcpConnectionState === 'Init') {
    LogDebug('IGNORED: ' + handleMessage)
    return
  }
            
  LogDebug(handleMessage)
  this._packageNumber += 1

  if(package.messageName === 'HeartbeatResponseCommand') return
  if(package.messageName === 'HeartbeatRequestCommand') {
    this._tcpConnection.enqueueSend({
    	messageName: 'HeartbeatResponseCommand'
  	, correlationId: package.correlationId
	  })
    return
  }

  if(package.messageName === 'Authenticated' || package.messageName === 'NotAuthenticated') {
    if(this._tcpConnectionState === 'Connecting'
    && this._connectingPhase === connectingPhase.Authentication
    && this._authInfo.correlationId === package.correlationId) {
      if(package.messageName === 'NotAuthenticated') {
        this._raiseAuthenticationFailed('Not authenticated')
      }

      this._goToConnectedState()
      return
    }
  }

  //BLM: Investigate if correlationId will be undefined or empty
  if(package.messageName === 'BadRequest') {
  console.log('connection logic handler line 458')
  	console.log(package)
  }
  if(package.messageName === 'BadRequest' && !package.correlationId) {
    var message = '<no message>'
    try {
    	package.payload.toString('UTF8') 
    }
    catch(e) {
    	message = (e && e.message) || message
    }

    var err = new Error('Bad request received from server. Error: ' + message)
    this._closeConnection('Connection-wide BadRequest received. Too dangerous to continue.', exc)
    return
  }

  var operationItem = this._operations.getActiveOperation(package.correlationId)
  	, subscriptionItem = this._subscriptions.getActiveSubscription(package.correlationId)

  if(operationItem) {
    var result = operationItem.operation.inspectPackage(package)
    LogDebug('HandleTcpPackage OPERATION DECISION ' + result.decision
    	+ ' (' + result.description
    	+ '), ' + operationItem.toString())
    switch (result.decision) {
      case inspection.decision.DoNothing: break
      case inspection.decision.EndOperation: 
        this._operations.removeOperation(operationItem)
        break
      case inspection.decision.Retry: 
        this._operations.scheduleOperationRetry(operationItem)
        break
      case inspection.decision.Reconnect:
        this._reconnectTo({
					tcpEndpoint: result.tcpEndpoint
				, secureTcpEndpoint: result.secureTcpEndpoint
				})
        this._operations.scheduleOperationRetry(operationItem)
        break
      default: throw new Error('Unknown inspection.decision: ' + result.decision)
    }

    if(this._tcpConnectionState === 'Connected') {
      this._operations.scheduleWaitingOperations(connection);
    }
  } else if(subscriptionItem) {
    var result = subscriptionItem.operation.inspectPackage(package)
    LogDebug('HandleTcpPackage SUBSCRIPTION DECISION ' + result.decision
    	+ ' (' + result.description
  		+ '), ' + subscriptionItem.toString())

    switch(result.decision) {
      case inspection.decision.DoNothing: break
      case inspection.decision.EndOperation: 
        this._subscriptions.removeSubscription(subscriptionItem);
        break
      case inspection.decision.Retry: 
        this._subscriptions.scheduleSubscriptionRetry(subscriptionItem);
        break
      case inspection.decision.Reconnect:
        this._reconnectTo({
					tcpEndpoint: result.tcpEndpoint
				, secureTcpEndpoint: result.secureTcpEndpoint
				})
        this._subscriptions.scheduleSubscriptionRetry(subscriptionItem)
        break
      case inspection.decision.Subscribed:
        subscriptionItem.isSubscribed = true
        break
      default: throw new Error('Unknown inspection.decision: ' + result.decision)
    }
  } else {
	  console.log('connection logic handler line 532')
  	console.log(package)
    LogDebug('HandleTcpPackage UNMAPPED PACKAGE with CorrelationId ' + package.correlationId
    	+ ', Command: ', package.messageName
    )
  }
}

var startConnectionHandlers = {
			Init: function(endpointDiscoverer, cb) {
				this._endpointDiscoverer = endpointDiscoverer
				this._tcpConnectionState = 'Connecting'
				this._connectingPhase = connectingPhase.Reconnecting
				this._discoverEndpoint(cb)
			}
		, Connecting: noOp
		, Connected: noOp
		, Closed: noOp
		}

var startOperationHandlers = {
			Init: function(operation, maxRetries, timeout) {
				operation.fail(new Error('EventStoreConnection is not active.'))
			}
		, Connecting: function(operation, maxRetries, timeout) {
				LogDebug('StartOperation enqueue ' + operation.toString() + ', ' + maxRetries + ', ' + timeout + '.')
				this._operations.enqueueOperation(operationsManager.item(operation, maxRetries, timeout, this._operations), function() { console.log(arguments)})
			}
		, Connected: function(operation, maxRetries, timeout) {
				LogDebug('StartOperation schedule ' + operation.toString() + ', ' + maxRetries + ', ' + timeout + '.')
				this._operations.scheduleOperation(operationsManager.item(operation, maxRetries, timeout, this._operations), this._tcpConnection)
			}
		, Closed: function(operation, maxRetries, timeout) {
				operation.fail(new Error('EventStoreConnection has been closed ', this._esConnection.connectionName))
			}
		}

function createSubscriptionItem(message) {
  var me = this
  	, operation = subscriptionOperation(message, function() { return me._tcpConnection })
  return subscriptionsManager.item(operation, message.maxRetries, message.timeout)
}

var startSubscriptionHandlers = {
			Init: function(message) {
				message.subscription.subscription.fail(new Error('Connection is not active ' + this._esConnection.connectionName))
			}
		, Connecting: function(message) {
				var item = createSubscriptionItem.call(this, message)
				LogDebug('StartSubscription enqueue '
					+ ', ' + message.subscription
					+ ', ' + message.maxRetries
					+ ', ' + message.timeout
					+ '.')
				this._subscriptions.enqueueSubscription(item)
			}
		, Connected: function(message) {
				var item = createSubscriptionItem.call(this, message)
				LogDebug('StartSubscription fire '
					+ ', ' + message.subscription
					+ ', ' + message.maxRetries
					+ ', ' + message.timeout
					+ '.')
				this._subscriptions.startSubscription(item, this._tcpConnection)
			}
		, Closed: function(message) {
				var err = new Error('EventStoreConnection has been closed ' + this._esConnection.connectionName)
				message.subscription.subscription.fail(err)
			}
		}

var timerTickHandlers = {
			Init: noOp
		, Connecting: function() {
      	if(this._connectingPhase === connectingPhase.Reconnecting
    		&& dateDiff.fromNow(this._reconnInfo.timeStamp) >= this._settings.reconnectionDelay) {
      		LogDebug('TimerTick checking reconnection...')

      		this._reconnInfo = this._reconnInfo.nextRetry()
      		if(this._settings.maxReconnections >= 0 && this._reconnInfo.reconnectionAttempt > this._settings.maxReconnections) {
      			this._closeConnection('Reconnection limit reached.')
      		} else {
      			this.emit('reconnecting', this._esConnection)
      			this._discoverEndpoint()
      		}
      	}

      	if(this._connectingPhase === connectingPhase.Authentication
    		&& dateDiff.fromNow(this._authInfo.timeStamp) > this._settings.operationTimeout) {
      		this._raiseAuthenticationFailed('Authentication timed out.')
    			this._goToConnectedState()
      	}

	      if(this._connectingPhase > connectingPhase.ConnectionEstablishing) {
	        this._manageHeartbeats()
	      }
			}
		, Connected: function() {
        if(dateDiff.fromNow(this._lastTimeoutsTimeStamp) >= this._settings.operationTimeoutCheckPeriod) {
        	this._reconnInfo = new ReconnectionInfo()
        	this._operations.checkTimeoutsAndRetry(this._tcpConnection)
        	this._subscriptions.checkTimeoutsAndRetry(this._tcpConnection)
        	this._lastTimeoutsTimeStamp = getIsoDate()
        }
        this._manageHeartbeats()
			}
		, Closed: noOp
		}


var connectingPhase = {
	Invalid: 0
, Reconnecting: 1
, EndpointDiscovery: 2
, ConnectionEstablishing: 3
, Authentication: 4
, Connected: 5
}


function AuthInfo(args) {
	var id = !!args ? args.correlationId : uuid.v4()
		, ts = !!args ? args.timeStamp : getIsoDate()
	Object.defineProperty(this, 'correlationId', { value: id })
	Object.defineProperty(this, 'timeStamp', { value: ts })
}

ReconnectionInfo.prototype.next = function() {
	return new AuthInfo({
		correlationId: uuid.v4()
	, timeStamp: getIsoDate()
	})
}


function HeartbeatInfo(lastPackageNumber, isIntervalStage, timeStamp) {
	Object.defineProperty(this, 'lastPackageNumber', { value: lastPackageNumber })
	Object.defineProperty(this, 'isIntervalStage', { value: isIntervalStage })
	Object.defineProperty(this, 'timeStamp', { value: timeStamp })
}


function ReconnectionInfo(args) {
	var val = !!args ? args.reconnectionAttempt : 0
		, ts = !!args ? args.timeStamp : getIsoDate()
	Object.defineProperty(this, 'reconnectionAttempt', { value: val })
	Object.defineProperty(this, 'timeStamp', { value: ts })
}

ReconnectionInfo.prototype.nextRetry = function() {
	return new ReconnectionInfo({
		value: this.reconnectionAttempt + 1
	, timeStamp: getIsoDate()
	})
}
