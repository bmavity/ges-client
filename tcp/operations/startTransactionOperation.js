var util = require('util')
	, inspection = require('./inspection')
	, position = require('../position')
	, eventPayloads = require('../eventPayloads')
	, OperationBase = require('./operationBase').OperationBase

module.exports = StartTransaction


function StartTransaction(operationData) {
	if(!(this instanceof StartTransaction)) {
		return new StartTransaction(operationData)
	}
	OperationBase.call(this, operationData)


	Object.defineProperty(this, 'requestMessage', { value: 'TransactionStart' })
	Object.defineProperty(this, 'requestType', { value: 'TransactionStart' })
	Object.defineProperty(this, 'responseMessage', { value: 'TransactionStartCompleted' })
	Object.defineProperty(this, 'responseType', { value: 'TransactionStartCompleted' })

	Object.defineProperty(this, '_stream', { value: operationData.stream })
	Object.defineProperty(this, '_requireMaster', { value: !!operationData.requireMaster })

	Object.defineProperty(this, '_expectedVersion', { value: operationData.data.expectedVersion })
	Object.defineProperty(this, '_parentConnection', { value: operationData.connection })
	

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
      return new inspection(inspection.decision.Retry, 'CommitTimeout')
    }
  , WrongExpectedVersion: function(response) {
      var err = 'Start transaction failed due to WrongExpectedVersion. Stream: ' + this._stream
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
util.inherits(StartTransaction, OperationBase)

StartTransaction.prototype.toRequestPayload = function() {
	return this._serialize({
		eventStreamId: this._stream
	, expectedVersion: this._expectedVersion
	, requireMaster: !!this._requireMaster
	})
}
	
StartTransaction.prototype.transformResponse = function(payload) {
	return new GesTransaction(payload.transactionId, this.userCredentials, this._parentConnection)
}

StartTransaction.prototype.toString = function() {
	return 'Stream: ' + this._stream + ', ExpectedVersion: ' + this._expectedVersion
}


function GesTransaction(transactionId, userCredentials, parentConnection) {
	Object.defineProperty(this, '_transactionId', { value: transactionId })
	Object.defineProperty(this, '_userCredentials', { value: userCredentials })
	Object.defineProperty(this, '_parentConnection', { value: parentConnection })
}

GesTransaction.prototype.commit = function(cb) {
	this._isCommitted = true
	this._parentConnection.commitTransaction({
		transactionId: this._transactionId
	, auth: this._userCredentials
	}, cb)
}

GesTransaction.prototype.write = function(events, cb) {
	if(!cb) {
		cb = events
		events = []
	}
	this._parentConnection.transactionalWrite({
		transactionId: this._transactionId
	, events: events
	, auth: this._userCredentials
	}, cb)
}


