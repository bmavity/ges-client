var tcpPackageConnection = require('./tcpPackageConnection')
	, util = require('util')
	, EventEmitter = require('events').EventEmitter
	, states = {
			Init: {
				CloseConnection: function(message, cb) {
					this._state = states['Closed']
					cb(null)
				}
			, EstablishTcpConnection: noOp
			, StartConnection: function(message, cb) {
					this._endPoint = message.endPoint
					this._state = states['Connecting']
					this._connectingPhase = 'Reconnecting'
					this._discoverEndPoint(cb)
				}
			, TcpConnectionEstablished: noOp
			}
		, Connecting: {
				CloseConnection: function(message, cb) {
					this._state = states['Closed']
					cb(null)
				}
			, EstablishTcpConnection: function(message) {
					if(this._connectingPhase !== 'EndPointDiscovery') return

					this._connectingPhase = 'ConnectionEstablishing'
					var me = this
						, connection = tcpPackageConnection({
								endPoint: this._endPoint
							})
					connection.on('connect', function() {
						me.enqueueMessage('TcpConnectionEstablished', {
							connection: connection
						})
					})
					this._connection = connection
				}
			, StartConnection: function(message, cb) {
					cb(null)
				}
			, TcpConnectionEstablished: function(message, cb) {
					if(this._connection !== message.connection || this.isClosed) return cb && cb(null)

					//TODO: Auth
					this.goToConnectedState()
				}
			}
		, Connected: {
				CloseConnection: function(message, cb) {
					this._state = states['Closed']
					cb(null)
				}
			, EstablishTcpConnection: noOp
			, StartConnection: function(message, cb) {
					cb(null)
				}
			}
			, TcpConnectionEstablished: noOp
		, Closed: {
				CloseConnection: noOp
			, EstablishTcpConnection: noOp
			, StartConnection: function(message, cb) {
					
				}
			}
			, TcpConnectionEstablished: noOp
		}

function noOp(message, cb) {
	cb && cb(null)
}	

module.exports = EsConnectionLogicHandler

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

	this._setState('Init')
	this._connectingPhase = 'Invalid'
}
util.inherits(EsConnectionLogicHandler, EventEmitter)

EsConnectionLogicHandler.prototype._discoverEndPoint = function(cb) {
	if(!this.isInState('Connecting')) return cb(null)
	if(this._connectingPhase !== 'Reconnecting') return cb(null)

	this._connectingPhase = 'EndPointDiscovery'
	//TODO: True endpoint discovery
	this.enqueueMessage('EstablishTcpConnection', {
		endPoint: this._endPoint
	}, cb)
}

EsConnectionLogicHandler.prototype.enqueueMessage = function(messageName, message, cb) {
	var me = this
	this._queuedMessages.push({
		messageName: messageName
	, message: message
	, cb: cb
	})

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
	var handler = this._state[next.messageName].call(this, next.message, next.cb)

	setImmediate(function() {
		me._processNextMessage()
	})
}

EsConnectionLogicHandler.prototype._setState = function(stateName) {
	this._state = states[stateName]
}
