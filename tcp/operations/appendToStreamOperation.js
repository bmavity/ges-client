var util = require('util')
	, inspection = require('./inspection')
	, position = require('../position')
	, eventPayloads = require('../eventPayloads')
	, OperationBase = require('./operationBase').OperationBase

module.exports = AppendToStream


function AppendToStream(operationData) {
	if(!(this instanceof AppendToStream)) {
		return new AppendToStream(operationData)
	}
	OperationBase.call(this, operationData)


	Object.defineProperty(this, 'requestMessage', { value: 'WriteEvents' })
	Object.defineProperty(this, 'requestType', { value: 'WriteEvents' })
	Object.defineProperty(this, 'responseMessage', { value: 'WriteEventsCompleted' })
	Object.defineProperty(this, 'responseType', { value: 'WriteEventsCompleted' })

	Object.defineProperty(this, '_requireMaster', { value: !!operationData.requireMaster })
	Object.defineProperty(this, '_stream', { value: operationData.stream })
	Object.defineProperty(this, '_events', { value: operationData.data.events })
	Object.defineProperty(this, '_expectedVersion', { value: operationData.data.expectedVersion })


	this._inspections = {
		Success: function(response) {
			/*
			if (_wasCommitTimeout)
                        Log.Debug('IDEMPOTENT WRITE SUCCEEDED FOR {0}.', this)
      */
			this.succeed()
			return inspection(inspection.decision.EndOperation, 'Success')
		}
	, PrepareTimeout: function(response) {
      return new inspection(inspection.decision.Retry, 'PrepareTimeout')
    }
  , ForwardTimeout: function(response) {
      return new inspection(inspection.decision.Retry, 'ForwardTimeout')
    }
  , CommitTimeout: function(response) {
      this._wasCommitTimeout = true
      return new inspection(inspection.decision.Retry, 'CommitTimeout')
    }
  , WrongExpectedVersion: function(response) {
      var err = 'Append failed due to WrongExpectedVersion. Stream: ' + this._stream
      	+ ', Expected version: ' + this._expectedVersion
      this.fail(new Error(err))
      return new inspection(inspection.decision.EndOperation, 'WrongExpectedVersion')
    }
  , StreamDeleted: function(response) {
      this.fail(new Error(this._stream))
      return new inspection(inspection.decision.EndOperation, 'StreamDeleted')
    }
  , InvalidTransaction: function() {
      this.fail(new Error('Invalid Transaction'))
      return new inspection(inspection.decision.EndOperation, 'InvalidTransaction')
    }
  , AccessDenied: function(response) {
      this.fail(new Error('Write access denied for stream ' + this._stream + '.'))
      return new inspection(inspection.decision.EndOperation, 'AccessDenied')
    }
	}
}
util.inherits(AppendToStream, OperationBase)

AppendToStream.prototype.toRequestPayload = function() {
	var events = !this._events ? [] : Array.isArray(this._events) ? this._events : [ this._events ]
	return this._serialize({
		eventStreamId: this._stream
	, expectedVersion: this._expectedVersion
	, events: events.map(eventPayloads.toEventStoreEvent)
	, requireMaster: this._requireMaster
	})
}
	
AppendToStream.prototype.transformResponse = function(payload) {
	var hasCommitPosition = payload.commitPosition || payload.commitPosition === 0
		, hasPreparePosition = payload.preparePosition || payload.preparePosition === 0

  return {
  	Status: payload.result
	, NextExpectedVersion: payload.lastEventNumber
  , LogPosition: position(payload)
	}
}

AppendToStream.prototype.toString = function() {
	return 'Stream: ' + this._stream + ', ExpectedVersion: ' + this._expectedVersion
}
