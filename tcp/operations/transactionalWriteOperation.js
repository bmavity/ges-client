var util = require('util')
	, inspection = require('./inspection')
	, position = require('../position')
	, eventPayloads = require('../eventPayloads')
	, OperationBase = require('./operationBase').OperationBase

module.exports = TransactionalWrite

/*
, TransactionalWrite: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'TransactionWrite'
		, toRequestPayload: function(payload) {
				var payload = operationData.data
					, events = !payload.events ? [] : Array.isArray(payload.events) ? payload.events : [ payload.events ]
				return messageParser.serialize('TransactionWrite', {
					transactionId: payload.transactionId
				, events: events.map(eventPayloads.toEventStoreEvent)
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'TransactionWriteCompleted'
		, toResponseObject: function(payload) {
				return {
					Result: payload.result
				, TransactionId: payload.transactionId
				, Message: payload.message
				}
			}
		}
	}
*/

function TransactionalWrite(operationData) {
	if(!(this instanceof TransactionalWrite)) {
		return new TransactionalWrite(operationData)
	}
	OperationBase.call(this, operationData)


	Object.defineProperty(this, 'requestMessage', { value: 'TransactionWrite' })
	Object.defineProperty(this, 'requestType', { value: 'TransactionWrite' })
	Object.defineProperty(this, 'responseMessage', { value: 'TransactionWriteCompleted' })
	Object.defineProperty(this, 'responseType', { value: 'TransactionWriteCompleted' })

	Object.defineProperty(this, '_requireMaster', { value: !!operationData.requireMaster })

	var payload = operationData.data
		, events = !payload.events ? [] : Array.isArray(payload.events) ? payload.events : [ payload.events ]

	Object.defineProperty(this, '_events', { value: events })
	Object.defineProperty(this, '_transactionId', { value: payload.transactionId })
	

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
  , AccessDenied: function(response) {
      this.fail(new Error('Write access denied'))
      return new inspection(inspection.decision.EndOperation, 'AccessDenied')
    }
	}
}
util.inherits(TransactionalWrite, OperationBase)

TransactionalWrite.prototype.toRequestPayload = function() {
	return this._serialize({
		transactionId: this._transactionId
	, events: this._events.map(eventPayloads.toEventStoreEvent)
	, requireMaster: !!this._requireMaster
	})
}
	
TransactionalWrite.prototype.transformResponse = function(payload) {
	return null
}

TransactionalWrite.prototype.toString = function() {
	return 'TransactionId: ' + this._transactionId
}

