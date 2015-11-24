var util = require('util')
	, uuid = require('node-uuid')
	, EventEmitter = require('events').EventEmitter
	, connectionLogicHandler = require('./connectionLogicHandler')
	, createSubscription = require('./subscription')
	, createCatchUpSubscription = require('./catchUpSubscription')
	, systemStreams = require('./systemStreams')
	, eventData = require('../eventData')
	, eventNumber = require('./eventNumber')
	, operations = require('./operations')
	, systemEventTypes = require('./systemEventTypes')
	, streamMetadata = require('./streamMetadata')
	, streamMetadataResult = require('./streamMetadataResult')
	, endpointDiscoverer = require('./staticEndpointDiscoverer')
	, messages = require('./messages')

module.exports = createConnection


function createConnection(opts, cb) {
	opts = opts || {}
	opts.host = opts.host || '127.0.0.1'
	opts.port = opts.port || 1113
	var connection = new EsTcpConnection(endpointDiscoverer({
				host: opts.host
			, port: opts.port
			}))
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


function EsTcpConnection(endpointDiscoverer) {
	EventEmitter.call(this)

	var me = this

	this._connectionName = uuid.v4()
	this._endpointDiscoverer = endpointDiscoverer

	this._handler = connectionLogicHandler(this)

	this._handler.on('connect', function(args) {
		me.emit.apply(me, ['connect', args])
	})
}
util.inherits(EsTcpConnection, EventEmitter)

EsTcpConnection.prototype.appendToStream = function(stream, appendData, cb) {
	this.enqueueOperation(operations.appendToStream({
	  stream: stream
	, auth: appendData.auth
	, data: appendData
	, cb: cb
	}))
}

EsTcpConnection.prototype.emitClose = function(reason) {
	this.emit('close', reason)
}

EsTcpConnection.prototype.startTransaction = function(stream, transactionData, cb) {
	var auth = transactionData.auth
		, me = this
	this.enqueueOperation(operations.startTransaction({
	  stream: stream
	, auth: auth
	, data: transactionData
	, connection: me
	, cb: cb
	}))
}

EsTcpConnection.prototype.transactionalWrite = function(writeData, cb) {
	this.enqueueOperation(operations.transactionalWrite({
	  auth: writeData.auth
	, data: writeData
	, cb: cb
	}))
}

EsTcpConnection.prototype.commitTransaction = function(commitData, cb) {
	this.enqueueOperation(operations.commitTransaction({
	  auth: commitData.auth
	, data: commitData
	, cb: cb
	}))
}

EsTcpConnection.prototype.deleteStream = function(stream, deleteData, cb) {
	this.enqueueOperation(operations.deleteStream({
	  stream: stream
	, auth: deleteData.auth
	, data: deleteData
	, cb: cb
	}))
}

EsTcpConnection.prototype.close = function() {
	this._handler.enqueueMessage(messages.closeConnection('Connection close requested by client.', null))
}

EsTcpConnection.prototype.connect = function() {
	this._handler.enqueueMessage(messages.startConnection(this._endpointDiscoverer, function(err) { }))
}

EsTcpConnection.prototype.enqueueOperation = function(operationData) {
	this._handler.enqueueMessage(messages.startOperation(operationData, 0, 10000))
}

EsTcpConnection.prototype.isInState = function(stateName) {
	return this._handler.isInState(stateName)
}

EsTcpConnection.prototype.readAllEventsBackward = function(readData, cb) {
	this.enqueueOperation(operations.readAllEventsBackward({
	  auth: readData.auth
	, data: readData
	, cb: cb
	}))
}

EsTcpConnection.prototype.readAllEventsForward = function(readData, cb) {
	this.enqueueOperation(operations.readAllEventsForward({
	  auth: readData.auth
	, data: readData
	, cb: cb
	}))
}

EsTcpConnection.prototype.readEvent = function(stream, readData, cb) {
	if(!stream) {
		return setImmediate(function() {
			cb(new Error('Argument: streamId cannot be null or empty.'))
		})
	}

	if(readData.eventNumber < -1) {
		setImmediate(function() {
			cb(new Error('Argument: eventNumber cannot be less than -1.'))
		})
		return
	}

	this.enqueueOperation(operations.readEvent({
		name: 'ReadEvent'
	, stream: stream
	, auth: readData.auth
	, data: readData
	, cb: cb
	}))
}

EsTcpConnection.prototype.readStreamEventsBackward = function(stream, readData, cb) {
	if(readData.count <= 0) {
		setImmediate(function() {
			cb(new Error('Argument: count must be positive.'))
		})
		return
	}

	this.enqueueOperation(operations.readStreamEventsBackward({
	  stream: stream
	, auth: readData.auth
	, data: readData
	, cb: cb
	}))
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

	this.enqueueOperation(operations.readStreamEventsForward({
	  stream: stream
	, auth: readData.auth
	, data: readData
	, cb: cb
	}))
}

EsTcpConnection.prototype.setStreamMetadata = function(stream, setData, cb) {
	var rawMetadata = !!setData.metadata ? setData.metadata : new Buffer(0)
		, metadata = Buffer.isBuffer(rawMetadata) ? rawMetadata : new Buffer(rawMetadata.toJSON())
		, metaevent = eventData(uuid.v4(), systemEventTypes.streamMetadata, true, metadata)
		, appendData = {
				auth: setData.auth
			, expectedVersion: setData.expectedMetastreamVersion
			, events: [ metaevent ]
			}
	this.appendToStream(systemStreams.metastreamOf(stream), appendData, cb)
}

EsTcpConnection.prototype.getStreamMetadata = function(stream, getData, cb) {
	this.getStreamMetadataAsRawBytes(stream, getData, function(err, result) {
		if(err) return cb(err)
		var metadata = streamMetadata(result.StreamMetadata)
		cb(null, streamMetadataResult(result.Stream, result.IsStreamDeleted, result.MetastreamVersion, metadata))
	})
}

EsTcpConnection.prototype.getStreamMetadataAsRawBytes = function(stream, getData, cb) {
	var readData = {
				eventNumber: -1
			, auth: getData.auth
			}
	this.readEvent(systemStreams.metastreamOf(stream), readData, function(err, result) {
		if(err) return cb(err)

		if(result.Status === 'Success') {
			var evt = result.Event.OriginalEvent
			return cb(null, streamMetadataResult(stream, false, evt.EventNumber, evt.Data))
		}

		if(result.Status === 'StreamDeleted') {
			return cb(null, streamMetadataResult(stream, true, eventNumber.deletedStream, streamMetadata()))
		}

		if(result.Status === 'NotFound' || result.Status === 'NoStream') {
			return cb(null, streamMetadataResult(stream, false, -1))
		}

		cb(new Error('Unexpected ReadEventResult: ' + result.Status + '.'))
	})
}

EsTcpConnection.prototype.subscribeToAll = function(subscriptionData) {
	subscriptionData = subscriptionData || {}

	var subscription = createSubscription()

	this._handler.enqueueMessage(messages.startSubscription({
	  auth: subscriptionData.auth
	, data: subscriptionData
	, subscription: subscription
	}, 0, 10000))

	return subscription
}

EsTcpConnection.prototype.subscribeToAllFrom = function(subscriptionData) {
	subscriptionData = subscriptionData || {}

	var subscription = createCatchUpSubscription(this, subscriptionData)
	subscription.start()
	return subscription
}

EsTcpConnection.prototype.subscribeToStream = function(stream, subscriptionData) {
	subscriptionData = subscriptionData || {}

	var subscription = createSubscription()

	this._handler.enqueueMessage(messages.startSubscription({
	  stream: stream
	, auth: subscriptionData.auth
	, data: subscriptionData
	, subscription: subscription
	}, 0, 10000))

	return subscription
}

EsTcpConnection.prototype.subscribeToStreamFrom = function(stream, subscriptionData) {
	subscriptionData = subscriptionData || {}

	var subscription = createCatchUpSubscription(this, stream, subscriptionData)
	subscription.start()
	return subscription
}
