var util = require('util')
	, inspection = require('./inspection')
	, position = require('../position')
	, eventPayloads = require('../eventPayloads')
	, OperationBase = require('./operationBase').OperationBase


module.exports = ReadAllEventsForward


function ReadAllEventsForward(operationData) {
	if(!(this instanceof ReadAllEventsForward)) {
		return new ReadAllEventsForward(operationData)
	}
	OperationBase.call(this, operationData)


	Object.defineProperty(this, 'requestMessage', { value: 'ReadAllEventsForward' })
	Object.defineProperty(this, 'requestType', { value: 'ReadAllEvents' })
	Object.defineProperty(this, 'responseMessage', { value: 'ReadAllEventsForwardCompleted' })
	Object.defineProperty(this, 'responseType', { value: 'ReadAllEventsCompleted' })

	Object.defineProperty(this, '_requireMaster', { value: !!operationData.requireMaster })

	Object.defineProperty(this, '_position', { value: operationData.data.position })
	Object.defineProperty(this, '_maxCount', { value: operationData.data.maxCount })
	Object.defineProperty(this, '_resolveLinkTos', { value: !!operationData.data.resolveLinkTos })


	this._inspections = {
		Success: function(response) {
			this.succeed()
			return inspection(inspection.decision.EndOperation, 'Success')
		}
  , Error: function(response) {
  		if(response.error) {
  			throw new Error('WRONG CASING ON RESPONSE.ERROR')
  		}

  		var message = response.Error || '<no message>'
			this.fail(new Error(mesage))
			return inspection(inspection.decision.EndOperation, 'Error')
		}
  , AccessDenied: function(response) {
			this.fail(new Error('Read access denied for $all.'))
			return inspection(inspection.decision.EndOperation, 'AccessDenied')
		}
	}
}
util.inherits(ReadAllEventsForward, OperationBase)

ReadAllEventsForward.prototype.toRequestPayload = function() {
	return this._serialize({
		commitPosition: this._position.commitPosition
	, preparePosition: this._position.preparePosition
	, maxCount: this._maxCount
	, resolveLinkTos: this._resolveLinkTos
	, requireMaster: this._requireMaster
	})
}
	
ReadAllEventsForward.prototype.transformResponse = function(payload) {
	var events = payload.events || []
	return {
		Status: payload.result
	, Events: events.map(eventPayloads.toResolvedEvent)
	, IsEndOfStream: events.length === 0
	, OriginalPosition: position(payload)
	, NextPosition: position({
			commitPosition: payload.nextCommitPosition
		, preparePosition: payload.nextPreparePosition
		})
	}
}

ReadAllEventsForward.prototype.toString = function() {
	return 'Position: ' + this._position.toString()
				+ ', MaxCount: ' + this._maxCount
				+ ', ResolveLinkTos: ' + this._resolveLinkTos
				+ ', RequireMaster: ' + this._requireMaster
}
