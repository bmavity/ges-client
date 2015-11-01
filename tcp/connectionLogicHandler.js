var tcpPackageConnection = require('./tcpPackageConnection')
	, operationsManager = require('./operationsManager')
	, operations = require ('./operations')
	, inspection = operations.inspection
	, subscriptionsManager = require('./subscriptionsManager')
	, createQueue = require('./simpleQueuedHandler')
	, messages = require('./messages')
	, ensure = require('../ensure')
	, util = require('util')
	, EventEmitter = require('events').EventEmitter
	, uuid = require('node-uuid')
	, Stopwatch = require('statman-stopwatch')
	, states = {
			Init: {
			  StartSubscription: function() {
			  	throw new Error('Connection is not active')
			  }
			}
		, Connecting: {
			  StartSubscription: function(message) {
					this._subscriptions.enqueueSubscription(message)
				}
			}
		, Connected: {
			  StartSubscription: function(message) {
					this._subscriptions.scheduleSubscription(message, this._tcpConnection)
				}
			}
		, Closed: {
			  StartSubscription: function(operation) {
					operation.cb(new Error('EventStoreConnection has been closed.'))
				}
			}
		}


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

function EsConnectionLogicHandler() {
	if(!(this instanceof EsConnectionLogicHandler)) {
		return new EsConnectionLogicHandler()
	}

	EventEmitter.call(this)

	var me = this

	this._queue = createQueue()
	this._stopwatch = new Stopwatch(true)

	this._queue.registerHandler('StartConnection', function(msg) { me._startConnection(msg.endpointDiscoverer, msg.cb) })
	this._queue.registerHandler('CloseConnection', function(msg) { me._closeConnection(msg.reason, msg.exception) })

	this._queue.registerHandler('StartOperation', function(msg) {
		me._startOperation(msg.operation, msg.maxRetries, msg.timeout)
	})

	this._queue.registerHandler('EstablishTcpConnection', function(msg) { me._establishTcpConnection(msg.endpoints) })
	this._queue.registerHandler('TcpConnectionEstablished', function(msg) { me._tcpConnectionEstablished(msg.connection) })
	this._queue.registerHandler('TcpConnectionError', function(msg) { 
		me._tcpConnectionError(msg.connection, message.exception)
	})
	this._queue.registerHandler('HandleTcpPackage', function(msg) { me._handleTcpPackage(msg.connection, msg.package) })

	this._queue.registerHandler('TimerTick', function(msg) { me._timerTick() })

	this._handlers = {}

	this._tcpConnection = null
	this._endPoint = null
	this._state = null

	this._queuedMessages = []
	this._operations = operationsManager()
	this._subscriptions = subscriptionsManager()

	this._setState('Init')

	this._tcpConnectionState = 'Init'
	this._connectingPhase = connectingPhase.Invalid
	this._wasConnected = false
	this._packageNumber = 0

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

EsConnectionLogicHandler.prototype._closeConnection = function(reason, exception) {
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

	//TODO: 
	LogDebug("EstablishTcpConnection to [" + endpoint.host + ':' + endpoint.port + "]")

	if(this._tcpConnectionState !== 'Connecting') return
	if(this._connectingPhase !== connectingPhase.EndpointDiscovery) return

	this._connectingPhase = connectingPhase.ConnectionEstablishing

	var me = this
		, connection = tcpPackageConnection({
				endPoint: endpoint
			})

	connection.on('connect', function() {
		me.enqueueMessage(messages.tcpConnectionEstablished(connection))
	})

	connection.on('package', function(data) {
		me.enqueueMessage(messages.handleTcpPackage(data.connection, data.package))
	})

	connection.on('error', function(err) {
		me.enqueueMessage(messages.tcpConnectionError(connection, err))
	})

	this._tcpConnection = connection
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

  this.emit('connect', this._tcpConnection.RemoteEndPoint)

/*
  if(this._stopwatch.read() - this._lastTimeoutsTimeStamp >= _settings.OperationTimeoutCheckPeriod) {
    this._operations.CheckTimeoutsAndRetry(_tcpConnection)
    this._subscriptions.CheckTimeoutsAndRetry(_tcpConnection)
    this._lastTimeoutsTimeStamp = this._stopwatch.read()
  }
*/
}

EsConnectionLogicHandler.prototype._isInPhase = function(connectingPhase) {
	return this._connectingPhase === connectingPhase
}

EsConnectionLogicHandler.prototype._manageHeartbeats = function() {
	if(this._tcpConnection === null) throw new Error('Trying to process heartbeat message when connection is null.')

  var timeout = 2000 //this._heartbeatInfo.IsIntervalStage ? this._settings.HeartbeatInterval : this._settings.HeartbeatTimeout
  if(this._stopwatch.read() - this._heartbeatInfo.TimeStamp < timeout) return

  var packageNumber = this._packageNumber
  if(this._heartbeatInfo.LastPackageNumber !== packageNumber) {
    this._heartbeatInfo = new HeartbeatInfo(packageNumber, true, this._stopwatch.read())
    return
  }

  if(this._heartbeatInfo.IsIntervalStage) {
    // TcpMessage.Heartbeat analog
    this._tcpConnection.enqueueSend({
			messageName: 'HeartbeatRequestCommand'
		, correlationId: uuid.v4()
		})
    this._heartbeatInfo = new HeartbeatInfo(this._heartbeatInfo.LastPackageNumber, false, this._stopwatch.read())
  } else {
    // TcpMessage.HeartbeatTimeout analog
    // TODO:
    LogInfo("EventStoreConnection '{0}': closing TCP connection [{1}, L{2}, {3:B}] due to HEARTBEAT TIMEOUT at pkgNum {4}.")
    /*
      _esConnection.ConnectionName, _tcpConnection.RemoteEndPoint, _tcpConnection.LocalEndPoint,
      _tcpConnection.ConnectionId, packageNumber)
*/
    this._closeTcpConnection("EventStoreConnection '{0}': closing TCP connection [{1}, L{2}, {3:B}] due to HEARTBEAT TIMEOUT at pkgNum {4}.")
	} 
}

EsConnectionLogicHandler.prototype._setState = function(stateName) {
	this._state = states[stateName]
}

EsConnectionLogicHandler.prototype._startConnection = function(endpointDiscoverer, cb) {
	this._getStateMessageHandler(startConnectionHandlers)
		.call(this, endpointDiscoverer, cb)
}

EsConnectionLogicHandler.prototype._startOperation = function(operation, maxRetries, timeout) {
	this._getStateMessageHandler(startOperationHandlers)
		.call(this, operation, maxRetries, timeout)
}

EsConnectionLogicHandler.prototype._tcpConnectionClosed = function(connection) {
	if(this._tcpConnectionState === 'Init') throw new Error()
  if(this._tcpConnectionState === 'Closed' || this._tcpConnection !== connection) {
  	/* TODO: */
      LogDebug("IGNORED (_state: {0}, _conn.ID: {1:B}, conn.ID: {2:B}): TCP connection to [{3}, L{4}] closed.", 
               this._tcpConnectionState, this._tcpConnection.ConnectionId, connection.ConnectionId, 
               connection.RemoteEndPoint, connection.LocalEndPoint)
    
    return
  }

  this._tcpConnectionState = 'Connecting'
  this._connectingPhase = connectingPhase.Reconnecting

  //TODO: 
  LogDebug("TCP connection to [{0}, L{1}, {2:B}] closed.", connection.RemoteEndPoint, connection.LocalEndPoint, connection.ConnectionId);

  //this._subscriptions.PurgeSubscribedAndDroppedSubscriptions(_tcpConnection.ConnectionId);
  this._reconnInfo = {
  	reconnectionAttempt: _reconnInfo.ReconnectionAttempt
  , timeStamp: this._stopwatch.read()
	}

  if(this._wasConnected) {
  	this._wasConnected = false
    this.emit('disconnected', connection.remoteEndPoint)
  }
}

EsConnectionLogicHandler.prototype._tcpConnectionEstablished = function(connection) {
	if(this._tcpConnectionState !== 'Connecting' || this._tcpConnection !== connection || connection.isClosed) {
		/* TODO: */
    LogDebug("IGNORED (_state {0}, _conn.Id {1:B}, conn.Id {2:B}, conn.closed {3}): TCP connection to [{4}, L{5}] established.", 
    	this._tcpConnectionState, this._tcpConnection.ConnectionId, connection.ConnectionId, 
     	connection.IsClosed, connection.RemoteEndPoint, connection.LocalEndPoint);
    
    return
  }

  //TODO:
  LogDebug("TCP connection to [{0}, L{1}, {2:B}] established.", connection.RemoteEndPoint, connection.LocalEndPoint, connection.ConnectionId);
  this._heartbeatInfo = new HeartbeatInfo(this._packageNumber, true, this._stopwatch.read());

  if((this._settings || {}).DefaultUserCredentials) {
    _connectingPhase = connectingPhase.Authentication;

/*
    _authInfo = new AuthInfo(Guid.NewGuid(), this._stopwatch.read());
    _tcpConnection.EnqueueSend(new TcpPackage('Authenticate,
                                             TcpFlags.Authenticated,
                                             _authInfo.CorrelationId,
                                             _settings.DefaultUserCredentials.Username,
                                             _settings.DefaultUserCredentials.Password, 
                                             null));
*/
  } else {
    this._goToConnectedState();
  }
}

EsConnectionLogicHandler.prototype._tcpConnectionError = function(tcpConnection, err) {
	if(tcpConnection !== this._tcpConnection) return
  if(this._tcpConnectionState === 'Closed') return

  LogDebug('TcpConnectionError connId ' + tcpConnection.connectionId
  	+ ', exc ' + err.message
  	+ '.'
	)
  this.closeConnection('TCP connection error occurred.', err);
}

EsConnectionLogicHandler.prototype._timerTick = function() {
	this._getStateMessageHandler(timerTickHandlers).call(this)
}

var noOp = function() {}

var closeConnectionHandlers = {
			Init: performCloseConnection
		, Connecting: performCloseConnection
		, Connected: performCloseConnection
		, Closed: function(reason, exception) {
				//TODO:
				LogDebug("CloseConnection IGNORED because is ESConnection is CLOSED, reason {0}, exception {1}.", reason, exception)
			}
		}

function performCloseConnection(reason, exception) {
	LogDebug('CloseConnection, reason ' + reason + ', exception ' + exception + '.');

	this._tcpConnectionState = 'Closed'

	clearInterval(this._timer)
	this._operations.cleanUp()
	//this._subscriptions.cleanUp()
	this._closeTcpConnection(reason)

	//TODO: 
	LogInfo("Closed. Reason: {0}.", reason);

	if(exception) {
		this.emit('error', exception)
	}

	this.emit('closed', reason)
}

var handleTcpPackageHandlers = {
			Init: noOp
		, Connecting: handleTcpPackage
		, Connected: handleTcpPackage
		, Closed: noOp
		}

function handleTcpPackage(connection, package) {
	if(this._tcpConnection !== connection || this._tcpConnectionState === 'Closed' || this._tcpConnectionState === 'Init') {
    LogDebug("IGNORED: HandleTcpPackage connId {0}, package {1}, {2}.", connection.ConnectionId, package.Command, package.CorrelationId)
    return
  }
            
  LogDebug("HandleTcpPackage connId {0}, package {1}, {2}.", this._tcpConnection.ConnectionId, package.Command, package.CorrelationId)
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
    if(this._tcpConnectionState === 'Connecting' && this._connectingPhase === connectingPhase.Authentication) {
     	//&& _authInfo.CorrelationId === package.correlationId) {
	/*
      if(package.Command == 'NotAuthenticated) {
        RaiseAuthenticationFailed("Not authenticated")
      }
      */

      this._goToConnectedState()
      return
    }
  }

  //BLM: Investigate if correlationId will be undefined or empty
  if(package.messageName === 'BadRequest' && package.correlationId === '00000000-0000-0000-0000-000000000000') {
    //string message = Helper.EatException(() => Helper.UTF8NoBom.GetString(package.Data.Array, package.Data.Offset, package.Data.Count))
    var exc = new Error('Bad request received from server. Error: {0}')
      // TODOD:
       // string.Format("Bad request received from server. Error: {0}", string.IsNullOrEmpty(message) ? "<no message>" : message));
    this._closeConnection('Connection-wide BadRequest received. Too dangerous to continue.', exc)
    return
  }

  var operationItem = this._operations.getActiveOperation(package.correlationId)
  if(operationItem) {
    var result = operationItem.operation.inspectPackage(package);
    LogDebug('HandleTcpPackage OPERATION DECISION ' + result.decision + ' (' + result.description + '), '
    	+ operationItem.toString())
    switch (result.decision) {
      case inspection.decision.DoNothing: break; 
      case inspection.decision.EndOperation: 
        this._operations.removeOperation(operationItem); 
        break;
      case inspection.decision.Retry: 
        _operations.scheduleOperationRetry(operation); 
        break;
      case inspection.decision.Reconnect:
        ReconnectTo(new NodeEndPoints(result.TcpEndPoint, result.SecureTcpEndPoint));
        _operations.scheduleOperationRetry(operation);
        break;
      default: throw new Exception(string.Format("Unknown inspection.decision: {0}", result.Decision));
    }

    if(this._tcpConnectionState === 'Connected') {
      this._operations.scheduleWaitingOperations(connection);
    }
  }
  /*
      else if (_subscriptions.TryGetActiveSubscription(package.CorrelationId, out subscription))
    {
      var result = subscription.Operation.InspectPackage(package);
      LogDebug("HandleTcpPackage SUBSCRIPTION DECISION {0} ({1}), {2}", result.Decision, result.Description, subscription);
      switch (result.Decision)
      {
        case inspection.decision.DoNothing: break;
        case inspection.decision.EndOperation: 
          _subscriptions.RemoveSubscription(subscription); 
          break;
        case inspection.decision.Retry: 
          _subscriptions.ScheduleSubscriptionRetry(subscription); 
          break;
        case inspection.decision.Reconnect:
          ReconnectTo(new NodeEndPoints(result.TcpEndPoint, result.SecureTcpEndPoint));
          _subscriptions.ScheduleSubscriptionRetry(subscription);
          break;
        case inspection.decision.Subscribed:
          subscription.IsSubscribed = true;
          break;
        default: throw new Exception(string.Format("Unknown inspection.decision: {0}", result.Decision));
      }
    }
    else
    {
      LogDebug("HandleTcpPackage UNMAPPED PACKAGE with CorrelationId {0:B}, Command: {1}", package.CorrelationId, package.Command);
    }
    */
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
				// TODO:
				LogDebug("StartOperation enqueue {0}, {1}, {2}, {3}.", operation, maxRetries, timeout);
				this._operations.enqueueOperation(operationsManager.item(operation, maxRetries, timeout, this._operations), function() { console.log(arguments)})
			}
		, Connected: function(operation, maxRetries, timeout) {
				LogDebug('StartOperation schedule ' + operation.toString() + ', ' + maxRetries + ', ' + timeout + '.')
				this._operations.scheduleOperation(operationsManager.item(operation, maxRetries, timeout, this._operations), this._tcpConnection)
			}
		, Closed: function(operation, maxRetries, timeout) {
				operation.fail(new Error('EventStoreConnection has been closed ', this._esConnection.name))
			}
		}

var timerTickHandlers = {
			Init: noOp
		, Connecting: function() {
			console.log(this._connectingPhase, this._tcpConnectionState)
			/* TODO:
			if (_connectingPhase === ConnectingPhase.Reconnecting) { // && this._stopwatch.read() - _reconnInfo.TimeStamp >= _settings.ReconnectionDelay) {
        LogDebug("TimerTick checking reconnection...")

        this._reconnInfo = new ReconnectionInfo(_reconnInfo.ReconnectionAttempt + 1, this._stopwatch.read())
        if(_settings.MaxReconnections >= 0 && _reconnInfo.ReconnectionAttempt > _settings.MaxReconnections) {
          this._closeConnection('Reconnection limit reached.')
        } else {
          this.emit('reconnecting')
          this._discoverEndpoint(noOp)
        }
      }
      */

      /* TODO: 
      if(_connectingPhase === ConnectingPhase.Authentication) { //&& this._stopwatch.read() - _authInfo.TimeStamp >= _settings.OperationTimeout) {
        RaiseAuthenticationFailed("Authentication timed out.")
        GoToConnectedState()
      }
      */

	      if(_connectingPhase > connectingPhase.ConnectionEstablishing) {
	        this._manageHeartbeats()
	      }
			}
		, Connected: function() {
			/* TODO:
				// operations timeouts are checked only if connection is established and check period time passed
        if (this._stopwatch.read() - _lastTimeoutsTimeStamp >= _settings.OperationTimeoutCheckPeriod) {
          // On mono even impossible connection first says that it is established
          // so clearing of reconnection count on ConnectionEstablished event causes infinite reconnections.
          // So we reset reconnection count to zero on each timeout check period when connection is established
          _reconnInfo = new ReconnectionInfo(0, this._stopwatch.read())
          _operations.CheckTimeoutsAndRetry(_tcpConnection)
          _subscriptions.CheckTimeoutsAndRetry(_tcpConnection)
          _lastTimeoutsTimeStamp = this._stopwatch.read()
        }
        */
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

function HeartbeatInfo(lastPackageNumber, isIntervalStage, timeStamp) {
	Object.defineProperty(this, 'LastPackageNumber', { value: lastPackageNumber })
	Object.defineProperty(this, 'IsIntervalStage', { value: isIntervalStage })
	Object.defineProperty(this, 'TimeStamp', { value: timeStamp })
}
