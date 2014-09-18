var util = require('util')
	, EventEmitter = require('events').EventEmitter

module.exports = EsCatchUpSubscription


function EsCatchUpSubscription(connection, stream, subscriptionData) {
	if(!(this instanceof EsCatchUpSubscription)) {
		return new EsCatchUpSubscription(connection, stream, subscriptionData)
	}

	EventEmitter.call(this)
	this._connection = connection
	this._stream = stream
	this._subscriptionData = subscriptionData
	this._liveSub = null
}
util.inherits(EsCatchUpSubscription, EventEmitter)

EsCatchUpSubscription.prototype._emit = function(evt, args) {
	this.emit.apply(this, [evt].concat(Array.prototype.slice.call(args, 0)))
}

EsCatchUpSubscription.prototype.start = function() {
	var me = this

	this._liveSub = this._connection
		.subscribeToStream(this._stream, this._subscriptionData)
		.on('dropped', function() { me._emit('dropped', arguments )})
		.on('event', function() { me._emit('event', arguments )})
		.on('error', function() { me._emit('error', arguments )})
}

EsCatchUpSubscription.prototype.stop = function() {
	this._liveSub.unsubscribe()
}
