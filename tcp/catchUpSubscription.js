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
	this._lastProcessedEventNumber = -1
	this._nextReadEventNumber = 0
	this._isDropped = false
	this._shouldStop = false
	this._liveQueue = []
	this._allowProcessing = false
}
util.inherits(EsCatchUpSubscription, EventEmitter)

EsCatchUpSubscription.prototype._emit = function(evt, args) {
	this.emit.apply(this, [evt].concat(Array.prototype.slice.call(args, 0)))
}

EsCatchUpSubscription.prototype._readEventsUntil = function(lastEventNumber, cb) {
	if(!cb) {
		cb = lastEventNumber
		lastEventNumber = null
	}

	var me = this
		, subData = this._subscriptionData
		, isDone = false

	function readEvents(start, count, done) {
		var readData = {
					start: start
				, count: count
				, resolveLinkTos: !!subData.resolveLinkTos
				, auth: subData.auth
				}

		if(me._isDropped) return done(null)
		me._connection.readStreamEventsForward(me._stream, readData, function(err, readResult) {
			if(err) return done(err)
			if(me._isDropped) return done(null)

			if(readResult.Status === 'Success') {
				readResult.Events.forEach(function(evt) {
					me._tryProcess(evt)
				})
				isDone = lastEventNumber === null ? readResult.IsEndOfStream : readResult.NextEventNumber > lastEventNumber
			} else if(readResult.Status === 'NoStream') {
				isDone = true
			} else {
				isDone = true
			}

			if(isDone) {
				done(null)
			} else {
				readEvents(readResult.NextEventNumber, count, done)
			}
		})
	}

	readEvents(0, 500, cb)
}

EsCatchUpSubscription.prototype._beginLive = function() {
	var me = this
	this._liveSub = this._connection
		.subscribeToStream(this._stream, this._subscriptionData)
		.on('dropped', function() {
			me._isDropped = true
			me._emit('dropped', arguments)
		})
		.on('event', function(evt) {
			me._liveQueue.push(evt)
			if(me._allowProcessing) {
				me._processLiveQueue()
			}
		})
		.on('error', function() { me._emit('error', arguments )})
}

EsCatchUpSubscription.prototype._tryProcess = function(evt) {
	var me = this
	setImmediate(function() {
		if(evt.OriginalEventNumber > me._lastProcessedEventNumber) {
			me.emit('event', evt)
			me._lastProcessedEventNumber = evt.OriginalEventNumber
		}
	})
}

EsCatchUpSubscription.prototype._runSubscription = function() {
	var me = this
	function catchUp(subData) {
		me._readEventsUntil(subData.lastEventNumber, function() {
			me.emit('live')
			me._allowProcessing = true
			me._processLiveQueue()
		})
	}

	if(!me._shouldStop) {
		me._readEventsUntil(function() {
			if(!me._shouldStop) {
				me._beginLive()
				me._liveSub.on('confirmed', catchUp)
			}
		})
	}
}

EsCatchUpSubscription.prototype._processLiveQueue = function() {
	var me = this

	function dequeueAndProcess() {
		var evt = me._liveQueue.shift()
		if(evt) {
			me._tryProcess(evt)
			dequeueAndProcess()
		}
	}
	dequeueAndProcess()
}

EsCatchUpSubscription.prototype.start = function() {
	this._runSubscription()
}

EsCatchUpSubscription.prototype.stop = function() {
	this._shouldStop = true
	if(this._liveSub) {
		this._liveSub.unsubscribe()
	} else {
		this._isDropped = true
		this.emit('dropped')
	}
}
