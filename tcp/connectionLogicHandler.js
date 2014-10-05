var tcpPackageConnection = require('./tcpPackageConnection')
	, operationsManager = require('./operationsManager')
	, subscriptionsManager = require('./subscriptionsManager')
	, util = require('util')
	, EventEmitter = require('events').EventEmitter
	, states = {
			Init: {
				CloseConnection: performCloseConnection
			, EstablishTcpConnection: noOp
			, HandleTcpPackage: noOp
			, StartConnection: function(message, cb) {
					this._endPoint = message.endPoint
					this._state = states['Connecting']
					this._connectingPhase = 'Reconnecting'
					this._discoverEndPoint(cb)
				}
			, StartOperation: raiseNotActive
			, StartSubscription: raiseNotActive
			, TcpConnectionEstablished: noOp
			}
		, Connecting: {
				CloseConnection: performCloseConnection
			, EstablishTcpConnection: function(message) {
					if(this._connectingPhase !== 'EndPointDiscovery') return

					this._connectingPhase = 'ConnectionEstablishing'
					var me = this
						, connection = tcpPackageConnection({
								endPoint: this._endPoint
							})
					connection.on('connect', function() {
						me.enqueueMessage({
							name: 'TcpConnectionEstablished'
						, data: {
								connection: connection
							}
						})
					})

					connection.on('package', function(data) {
						me.enqueueMessage({
							name: 'HandleTcpPackage'
						, data: {
								connection: data.connection
							, package: data.package
							}
						})
					})

					this._connection = connection
				}
			, HandleTcpPackage: handlePackage
			, StartConnection: function(message, cb) {
					cb(null)
				}
			, StartOperation: function(operation, cb) {
					this._operations.enqueueOperation(operation, cb)
				}
			, StartSubscription: function(message) {
					this._subscriptions.enqueueSubscription(message)
				}
			, TcpConnectionEstablished: function(message, cb) {
					if(this._connection !== message.connection || this.isClosed) return cb && cb(null)

					//TODO: Auth
					this.goToConnectedState()
				}
			}
		, Connected: {
				CloseConnection: performCloseConnection
			, EstablishTcpConnection: noOp
			, HandleTcpPackage: handlePackage
			, StartConnection: function(message, cb) {
					cb(null)
				}
			, StartOperation: function(operation) {
					this._operations.scheduleOperation(operation, this._connection)
				}
			, StartSubscription: function(message) {
					this._subscriptions.scheduleSubscription(message, this._connection)
				}
			, StartConnection: function(message, cb) {
					cb(null)
				}
			, TcpConnectionEstablished: noOp
			}
		, Closed: {
				CloseConnection: noOp
			, EstablishTcpConnection: noOp
			, HandleTcpPackage: noOp
			, StartConnection: function(message, cb) {
					//TODO: ?
					cb && cb(null)
				}
			, StartOperation: raiseClosed
			, StartSubscription: raiseClosed
			, TcpConnectionEstablished: noOp
			}
		}

module.exports = EsConnectionLogicHandler


function handlePackage(message) {
	if(this._connection !== message.connection) return noOp()

	var messageName = message.package.messageName
		, correlationId = message.package.correlationId

	if(messageName === 'HeartbeatResponseCommand') {
		console.log(message.package)
		return
	}

	if(messageName === 'HeartbeatRequestCommand') {
		this._connection.enqueueSend({
				messageName: 'HeartbeatResponseCommand'
			, correlationId: correlationId
		})
		return
	}
	
	var operation = this._operations.getActiveOperation(correlationId)
	if(operation) {
		operation.finish(message.package)
		return
	}

	var subscription = this._subscriptions.getActiveSubscription(correlationId)
	if(subscription) {
		subscription.finish(message.package)
		return
	}
}

function performCloseConnection(message, cb) {
	this._setState('Closed')
	this._closeTcpConnection(message.reason, function(err) {
		cb(null)
	})
}

function raiseClosed(operation) {
	operation.cb(new Error('EventStoreConnection has been closed.'))
}

function raiseNotActive(operation, cb) {
	operation.cb(new Error('EventStoreConnection is not active.'))
}

function noOp(message, cb) {
	cb && cb(null)
}	

function EsConnectionLogicHandler() {
	if(!(this instanceof EsConnectionLogicHandler)) {
		return new EsConnectionLogicHandler()
	}

	EventEmitter.call(this)


	this._handlers = {}

	this._connection = null
	this._endPoint = null
	this._state = null

	this._queuedMessages = []
	this._operations = operationsManager()
	this._subscriptions = subscriptionsManager()

	this._setState('Init')
	this._connectingPhase = 'Invalid'
}
util.inherits(EsConnectionLogicHandler, EventEmitter)


EsConnectionLogicHandler.prototype._closeTcpConnection = function(reason, cb) {
	var me = this
	if(this._connection === null) return cb(null)

	this._connection.close(reason, function(err) {
		if(err) return cb(err)

		if(this._connection) {
			this._connection.removeAllListeners()
			this._connection = null
		}
		cb(null)
	})
}

EsConnectionLogicHandler.prototype._discoverEndPoint = function(cb) {
	if(!this.isInState('Connecting')) return cb(null)
	if(this._connectingPhase !== 'Reconnecting') return cb(null)

	this._connectingPhase = 'EndPointDiscovery'
	//TODO: True endpoint discovery
	this.enqueueMessage({
		name: 'EstablishTcpConnection'
	, data: {
			endPoint: this._endPoint
		}
	, cb: cb
	})
}

EsConnectionLogicHandler.prototype.enqueueMessage = function(message) {
	var me = this

	this._queuedMessages.push(message)

	setImmediate(function() {
		me._processNextMessage()
	})
}

EsConnectionLogicHandler.prototype.goToConnectedState = function() {
	this._setState('Connected')
	this._connectingPhase = 'Connected'

	this.emit('connect', {
		endPoint: this._endPoint
	})
}

EsConnectionLogicHandler.prototype.isInState = function(stateName) {
	return this._state === states[stateName]
}

EsConnectionLogicHandler.prototype._processNextMessage = function() {
	var me = this
		, next = this._queuedMessages.shift()

	if(!next) return 
	//if(!handler) return next.cb && next.cb(new Error())
	var handler = this._state[next.name]
	handler.call(this, next.data, next.cb)

	setImmediate(function() {
		me._processNextMessage()
	})
}

EsConnectionLogicHandler.prototype._setState = function(stateName) {
	this._state = states[stateName]
}
