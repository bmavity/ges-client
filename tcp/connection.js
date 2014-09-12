var util = require('util')
	, EventEmitter = require('events').EventEmitter
	, connectionLogicHandler = require('./connectionLogicHandler')
	, createSubscription = require('./subscription')

module.exports = createConnection


function createConnection(opts, cb) {
	opts = opts || {}
	opts.host = opts.host || '127.0.0.1'
	opts.port = opts.port || 1113
	var connection = new EsTcpConnection({
				host: opts.host
			, port: opts.port
			})
		, onConnect = function() {
				connection.removeListener('connect', onConnect)
				connection.removeListener('error', onErr)
				cb(null, connection)
			}
		, onErr = function(err) {
				connection.removeListener('connect', onConnect)
				connection.removeListener('error', onErr)
				cb(err)
			}

	if(cb) {
		connection.on('connect', onConnect)
		connection.on('error', onErr)
	}

	if(!opts.requireExplicitConnection) {
		connection.connect()
	}

	return connection
}


function EsTcpConnection(endPoint) {
	EventEmitter.call(this)

	var me = this

	this._endPoint = endPoint

	this._handler = connectionLogicHandler()

	this._handler.on('connect', function(args) {
		me.emit.apply(me, ['connect'].concat(Array.prototype.slice.call(arguments, 0)))
	})
}
util.inherits(EsTcpConnection, EventEmitter)

EsTcpConnection.prototype.appendToStream = function(stream, appendData, cb) {
	this.enqueueOperation({
		name: 'AppendToStream'
	, stream: stream
	, auth: appendData.auth
	, data: appendData
	, cb: cb
	})
}

EsTcpConnection.prototype.close = function(cb) {
	this._handler.enqueueMessage({
		name: 'CloseConnection'
	, data: {
			reason: 'Connection close requested by client.'
		, exception: null
		}
	, cb: cb
	})
}

EsTcpConnection.prototype.connect = function() {
	this._handler.enqueueMessage({
		name: 'StartConnection'
	, data: {
			endPoint: this._endPoint
		}
	})
}

EsTcpConnection.prototype.enqueueOperation = function(operationData) {
	this._handler.enqueueMessage({
		name: 'StartOperation'
	, data: operationData
	})
}

EsTcpConnection.prototype.isInState = function(stateName) {
	return this._handler.isInState(stateName)
}

EsTcpConnection.prototype.readAllEventsForward = function(cb) {
	var uuid = require('node-uuid')
  var correlationId = uuid.v4()
	this._storeCallback(correlationId, cb)

  this._sender.send({
  	messageName: 'ReadAllEventsForward'
  , correlationId: correlationId
  , payload: {
  		name: 'ReadAllEvents'
  	, data: {
				commit_position: 0
			, prepare_position: 0
			, max_count: 1000
			, resolve_link_tos: false
			, require_master: false
			}
		}
	})
}

EsTcpConnection.prototype.readStreamEventsForward = function(stream, readData, cb) {
	if(readData.start < 0) {
		setImmediate(function() {
			cb(new Error('Argument: start must be non-negative.'))
		})
		return
	}
	if(readData.count <= 0) {
		setImmediate(function() {
			cb(new Error('Argument: count must be positive.'))
		})
		return
	}

	this.enqueueOperation({
		name: 'ReadStreamEventsForward'
	, stream: stream
	, auth: readData.auth
	, data: readData
	, cb: cb
	})
}

/*
EsTcpConnection.prototype.setStreamMetadata = function(stream, expectedMetastreamVersion, metadata, cb) {
	this.enqueueOperation('AppendToStream', {
		stream: stream
	, start: options.start
	, count: options.count
	, resolveLinkTos: !!options.resolveLinkTos
	, requireMaster: !!options.requireMaster
	}, cb)
}
*/

EsTcpConnection.prototype.subscribeToStream = function(stream, subscriptionData) {
	subscriptionData = subscriptionData || {}

	var subscription = createSubscription()

	this._handler.enqueueMessage({
		name: 'StartSubscription'
	, data: {
			name: 'SubscribeToStream'
		, stream: stream
		, auth: subscriptionData.auth
		, data: subscriptionData
		, subscription: subscription
		}
	})

	return subscription
}

