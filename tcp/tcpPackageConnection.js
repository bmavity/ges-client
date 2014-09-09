var net = require('net')
	, util = require('util')
	, EventEmitter = require('events').EventEmitter

module.exports = TcpPackageConnection


function TcpPackageConnection(opts) {
	if(!(this instanceof TcpPackageConnection)) {
		return new TcpPackageConnection(opts)
	}

	EventEmitter.call(this)

	var socket = net.connect(opts.endPoint)
		, closeCallbacks = []
		, me = this

	socket.on('connect', function() {
		me.emit.apply(me, ['connect'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	socket.on('error', function() {
		me.emit.apply(me, ['error'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	socket.on('close', function(result) {
		closeCallbacks.forEach(function(cb) {
			cb(null)
		})
		me.emit.call(me, 'close', result)
	})

	this._socket = socket
	this._closeCallbacks = closeCallbacks
}
util.inherits(TcpPackageConnection, EventEmitter)


TcpPackageConnection.prototype.close = function(reason, cb) {
	this._closeCallbacks.push(cb)
	this._socket.destroy()
}