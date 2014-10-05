var util = require('util')
	, is = require('is')
	, EventEmitter = require('events').EventEmitter
	, position = require('./position')

module.exports = function(connection, stream, subscriptionData) {
	if(is.string(stream)) {
		subscriptionData = subscriptionData || {}
		return new EsStreamCatchUpSubscription(connection, stream, subscriptionData)
	} else {
		subscriptionData = is.undef(stream) ? {} : stream
		return new EsAllCatchUpSubscription(connection, subscriptionData)
	}
}


function EsCatchUpSubscription(connection, subscriptionData) {
	EventEmitter.call(this)

	this._connection = connection
	this._subscriptionData = subscriptionData
	this._liveSub = null
	this._isDropped = false
	this._shouldStop = false
	this._liveQueue = []
	this._allowProcessing = false
}
util.inherits(EsCatchUpSubscription, EventEmitter)

EsCatchUpSubscription.prototype._emit = function(evt, args) {
	this.emit.apply(this, [evt].concat(Array.prototype.slice.call(args, 0)))
}

EsCatchUpSubscription.prototype._runSubscription = function() {
	var me = this
	function catchUp(subData) {
		//console.log('Catching up from ', subData)
		me._readEventsUntil(subData, function() {
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


function EsStreamCatchUpSubscription(connection, stream, subscriptionData) {
	if(!(this instanceof EsStreamCatchUpSubscription)) {
		return new EsStreamCatchUpSubscription(connection, stream, subscriptionData)
	}
	EsCatchUpSubscription.call(this, connection, subscriptionData)

	this._stream = stream
	this._nextReadEventNumber = 0

	this.lastProcessedEventNumber = subscriptionData.startProcessingAfter || -1
}
util.inherits(EsStreamCatchUpSubscription, EsCatchUpSubscription)

EsStreamCatchUpSubscription.prototype._readEventsUntil = function(subscriptionResult, cb) {
	var lastEventNumber = null
	if(cb) {
		lastEventNumber = subscriptionResult.lastEventNumber
	} else {
		cb = subscriptionResult
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

EsStreamCatchUpSubscription.prototype._beginLive = function() {
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

EsStreamCatchUpSubscription.prototype._tryProcess = function(evt) {
	var me = this
	setImmediate(function() {
		if(evt.OriginalEventNumber > me.lastProcessedEventNumber) {
			me.emit('event', evt)
			me.lastProcessedEventNumber = evt.OriginalEventNumber
		}
	})
}


function EsAllCatchUpSubscription(connection, subscriptionData) {
	if(!(this instanceof EsAllCatchUpSubscription)) {
		return new EsAllCatchUpSubscription(connection, subscriptionData)
	}

	EsCatchUpSubscription.call(this, connection, subscriptionData)
	
	this._nextReadPosition = subscriptionData.startProcessingAfter || position.start

	this.lastProcessedPosition = subscriptionData.startProcessingAfter || position(-1, -1)
}
util.inherits(EsAllCatchUpSubscription, EsCatchUpSubscription)


EsAllCatchUpSubscription.prototype._readEventsUntil = function(subscriptionResult, cb) {
	var lastPosition = null
	if(cb) {
		lastPosition = position(subscriptionResult.lastCommitPosition, subscriptionResult.lastCommitPosition)
	} else {
		cb = subscriptionResult
	}

	var me = this
		, subData = this._subscriptionData
		, isDone = false

	function readEvents(count, done) {
		var readData = {
					position: me._nextReadPosition
				, maxCount: count
				, resolveLinkTos: !!subData.resolveLinkTos
				, auth: subData.auth
				}

		if(me._isDropped) return done(null)

		//console.log('reading from position ' + readData.position.commitPosition)
		me._connection.readAllEventsForward(readData, function(err, readResult) {
			if(err) return done(err)
			if(me._isDropped) return done(null)

			//console.log(readResult.Events.length + ' total events read from position ' + readData.position.commitPosition)
			readResult.Events.forEach(function(evt) {
				me._tryProcess(evt)
			})

			me._nextReadPosition = readResult.NextPosition
			isDone = lastPosition === null
				? readResult.IsEndOfStream
				: readResult.NextPosition.compare(lastPosition) >= 0

			//console.log('reading isDone = ' + isDone + ' for lastPosition of ', lastPosition)
			if(isDone) {
				done(null)
			} else {
				readEvents(count, done)
			}
		})
	}

	readEvents(500, cb)
}

EsCatchUpSubscription.prototype._beginLive = function() {
	var me = this
	this._liveSub = this._connection
		.subscribeToAll(this._subscriptionData)
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

EsAllCatchUpSubscription.prototype._tryProcess = function(evt) {
	var me = this
	setImmediate(function() {
		if(evt.OriginalPosition.compare(me.lastProcessedPosition) === 1) {
			me.emit('event', evt)
			//console.log('setting last position')
			//console.log(evt.OriginalPosition.commitPosition)
			me.lastProcessedPosition = evt.OriginalPosition
		}
	})
}
