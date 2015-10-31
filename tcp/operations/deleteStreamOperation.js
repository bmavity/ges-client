var util = require('util')
	, inspection = require('./inspection')
	, position = require('../position')
	, eventPayloads = require('../eventPayloads')
	, OperationBase = require('./operationBase').OperationBase

module.exports = DeleteStream


function DeleteStream(operationData) {
	if(!(this instanceof DeleteStream)) {
		return new DeleteStream(operationData)
	}
	OperationBase.call(this, operationData)


	Object.defineProperty(this, 'requestMessage', { value: 'DeleteStream' })
	Object.defineProperty(this, 'requestType', { value: 'DeleteStream' })
	Object.defineProperty(this, 'responseMessage', { value: 'DeleteStreamCompleted' })
	Object.defineProperty(this, 'responseType', { value: 'DeleteStreamCompleted' })

	Object.defineProperty(this, '_stream', { value: operationData.stream })
	Object.defineProperty(this, '_requireMaster', { value: !!operationData.requireMaster })

	Object.defineProperty(this, '_expectedVersion', { value: operationData.data.expectedVersion })
	Object.defineProperty(this, '_hardDelete', { value: operationData.data.hardDelete })
	

	this._inspections = {
		Success: function(response) {
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
      var err = 'Delete stream due to WrongExpectedVersion. Stream: ' + this._stream
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
      this.fail(new Error('Delete access denied for stream ' + this._stream + '.'))
      return new inspection(inspection.decision.EndOperation, 'AccessDenied')
    }
	}
}
util.inherits(DeleteStream, OperationBase)

DeleteStream.prototype.toRequestPayload = function() {
	return this._serialize({
		eventStreamId: this._stream
	, expectedVersion: this._expectedVersion
	, requireMaster: !!this._requireMaster
	, hardDelete: !!this._hardDelete
	})
}
	
DeleteStream.prototype.transformResponse = function(payload) {
	return {
  	Status: payload.result
  , LogPosition: position(payload)
	}
}

DeleteStream.prototype.toString = function() {
	return 'Stream: ' + this._stream + ', ExpectedVersion: ' + this._expectedVersion
}