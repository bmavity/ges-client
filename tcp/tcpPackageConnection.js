var net = require('net')
	, util = require('util')
	, EventEmitter = require('events').EventEmitter
	, framer = require('./lengthPrefixMessageFramer')
	, messageReceiver = require('./messageReceiver')

module.exports = TcpPackageConnection


function TcpPackageConnection(opts) {
	if(!(this instanceof TcpPackageConnection)) {
		return new TcpPackageConnection(opts)
	}

	EventEmitter.call(this)

	var socket = net.connect(opts.endPoint)
		, receiver = messageReceiver()
		, me = this

	socket.on('connect', function() {
		me.emit.apply(me, ['connect'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	socket.on('data', function(data) {
		receiver.processData(data)
	})

	socket.on('error', function(err) {
		me.emit('error', err)
	})

	socket.on('close', function(result) {
		me.isClosed = true
		me.emit.call(me, 'close', result)
	})

	receiver.on('message', function(message) {
		me.emit('package', {
			connection: me
		, package: message
		})
	})

	Object.defineProperty(this, '_socket', { value: socket })

	Object.defineProperty(this, 'connectionId', { value: opts.connectionId })

	this.isClosed = false
	this.localEndpoint = new Endpoint()
	this.remoteEndpoint = new Endpoint(opts.endPoint.host, opts.endPoint.port)
}
util.inherits(TcpPackageConnection, EventEmitter)


TcpPackageConnection.prototype.cleanup = function() {
	this._socket.removeAllListeners()
	this.removeAllListeners()
}

TcpPackageConnection.prototype.close = function(reason, cb) {
	var me = this
	this._socket.removeAllListeners('close')
	this._socket.on('close', function(result) {
		me.isClosed = true
		cb()
	})
	this._socket.destroy()
}

TcpPackageConnection.prototype.enqueueSend = function(packetData) {
	var packet = framer.frame(packetData.messageName, packetData.correlationId, packetData.payload, packetData.userCredentials)

	this._socket.write(packet)
}


function Endpoint(host, port) {
	Object.defineProperty(this, 'host', { value: host })
	Object.defineProperty(this, 'port', { value: port })
}

Endpoint.prototype.toString = function() {
	return this.host ? this.host + ':' + this.port : '<empty endpoint>'
}
