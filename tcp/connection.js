var util = require('util')
	, uuid = require('node-uuid')
	, EventEmitter = require('events').EventEmitter
	, connectionLogicHandler = require('./connectionLogicHandler')
	, createSubscription = require('./subscription')
	, systemStreams = require('./systemStreams')
	, eventData = require('../eventData')
	, systemEventTypes = require('./systemEventTypes')
	, streamMetadata = require('./streamMetadata')
	, streamMetadataResult = require('./streamMetadataResult')

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

EsTcpConnection.prototype.readAllEventsBackward = function(readData, cb) {
	this.enqueueOperation({
		name: 'ReadAllEventsBackward'
	, auth: readData.auth
	, data: readData
	, cb: cb
	})
}

EsTcpConnection.prototype.readAllEventsForward = function(readData, cb) {
	this.enqueueOperation({
		name: 'ReadAllEventsForward'
	, auth: readData.auth
	, data: readData
	, cb: cb
	})
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

	this.enqueueOperation({
		name: 'ReadEvent'
	, stream: stream
	, auth: readData.auth
	, data: readData
	, cb: cb
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

EsTcpConnection.prototype.setStreamMetadata = function(stream, setData, cb) {
	var rawMetadata = !!setData.metadata ? setData.metadata : new Buffer(0)
		, metadata = Buffer.isBuffer(rawMetadata) ? rawMetadata : new Buffer(rawMetadata.toJSON())
		, metaevent = eventData(uuid.v4(), systemEventTypes.streamMetadata, true, metadata)
		, appendData = {
				expectedVersion: setData.expectedMetastreamVersion
			, events: [ metaevent ]
			}
	this.enqueueOperation({
		name: 'AppendToStream'
	, stream: systemStreams.metastreamOf(stream)
	, auth: setData.auth
	, data: appendData
	, cb: cb
	})
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

		var evt = result.Event.OriginalEvent
		if(result.Status === 'Success') {
			cb(null, streamMetadataResult(stream, false, evt.EventNumber, evt.Data))
		}
	})
}

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

