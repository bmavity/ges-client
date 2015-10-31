var util = require('util')
	, inspection = require('./inspection')
	, position = require('../position')
	, eventPayloads = require('../eventPayloads')
	, OperationBase = require('./operationBase').OperationBase

module.exports = CommitTransaction


function CommitTransaction(operationData) {
	if(!(this instanceof CommitTransaction)) {
		return new CommitTransaction(operationData)
	}
	OperationBase.call(this, operationData)

/*
, CommitTransaction: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'TransactionCommit'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('TransactionCommit', {
					transactionId: payload.transactionId
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'TransactionCommitCompleted'
		, toResponseObject: function(payload) {
				return {
					Result: payload.result
				, TransactionId: payload.transactionId
				, Message: payload.message
				, FirstEventNumber: payload.firstEventNumber
				, NextExpectedVersion: payload.lastEventNumber
				, LogPosition: position(payload)
				}
			}
		}
	}
*/

	Object.defineProperty(this, 'requestMessage', { value: 'TransactionCommit' })
	Object.defineProperty(this, 'requestType', { value: 'TransactionCommit' })
	Object.defineProperty(this, 'responseMessage', { value: 'TransactionCommitCompleted' })
	Object.defineProperty(this, 'responseType', { value: 'TransactionCommitCompleted' })

	Object.defineProperty(this, '_requireMaster', { value: !!operationData.requireMaster })

	Object.defineProperty(this, '_transactionId', { value: operationData.data.transactionId })
	

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
      var err = 'Commit transaction failed due to WrongExpectedVersion. TransactionId: ' + this._transactionId
      this.fail(new Error(err))
      return new inspection(inspection.decision.EndOperation, 'WrongExpectedVersion')
    }
  , StreamDeleted: function(response) {
      this.fail(new Error('Stream was deleted'))
      return new inspection(inspection.decision.EndOperation, 'StreamDeleted')
    }
  , InvalidTransaction: function() {
      this.fail(new Error('Invalid Transaction'))
      return new inspection(inspection.decision.EndOperation, 'InvalidTransaction')
    }
  , AccessDenied: function(response) {
      this.fail(new Error('Write access denied' + this._stream + '.'))
      return new inspection(inspection.decision.EndOperation, 'AccessDenied')
    }
	}
}
util.inherits(CommitTransaction, OperationBase)

CommitTransaction.prototype.toRequestPayload = function() {
	return this._serialize({
		transactionId: this._transactionId
	, requireMaster: !!this._requireMaster
	})
}
	
CommitTransaction.prototype.transformResponse = function(payload) {
	return {
		Result: payload.result
	, TransactionId: payload.transactionId
	, Message: payload.message
	, FirstEventNumber: payload.firstEventNumber
	, NextExpectedVersion: payload.lastEventNumber
	, LogPosition: position(payload)
	}
}

CommitTransaction.prototype.toString = function() {
	return 'Stream: ' + this._stream + ', ExpectedVersion: ' + this._expectedVersion
}

