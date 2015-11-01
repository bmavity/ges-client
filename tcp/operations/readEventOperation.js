var util = require('util')
	, inspection = require('./inspection')
	, position = require('../position')
	, eventPayloads = require('../eventPayloads')
	, OperationBase = require('./operationBase').OperationBase

module.exports = ReadEvent


function ReadEvent(operationData) {
	if(!(this instanceof ReadEvent)) {
		return new ReadEvent(operationData)
	}
	OperationBase.call(this, operationData)


	Object.defineProperty(this, 'requestMessage', { value: 'ReadEvent' })
	Object.defineProperty(this, 'requestType', { value: 'ReadEvent' })
	Object.defineProperty(this, 'responseMessage', { value: 'ReadEventCompleted' })
	Object.defineProperty(this, 'responseType', { value: 'ReadEventCompleted' })

	Object.defineProperty(this, '_stream', { value: operationData.stream })
	Object.defineProperty(this, '_requireMaster', { value: !!operationData.requireMaster })

	Object.defineProperty(this, '_eventNumber', { value: operationData.data.eventNumber })
	Object.defineProperty(this, '_resolveLinkTos', { value: !!operationData.data.resolveLinkTos })


	this._inspections = {
		Success: function(response) {
			this.succeed()
			return inspection(inspection.decision.EndOperation, 'Success')
		}
	, StreamDeleted: function(response) {
			this.succeed()
			return inspection(inspection.decision.EndOperation, 'StreamDeleted')
		}
  , NoStream: function(response) {
			this.succeed()
			return inspection(inspection.decision.EndOperation, 'NoStream')
		}
	, NotFound: function(response) {
			this.succeed()
			return inspection(inspection.decision.EndOperation, 'NotFound')
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
			this.fail(new Error('Read access denied for stream ' + this._stream + '.'))
			return inspection(inspection.decision.EndOperation, 'AccessDenied')
		}
	}
}
util.inherits(ReadEvent, OperationBase)

ReadEvent.prototype.toRequestPayload = function() {
	return this._serialize({
		eventStreamId: this._stream
	, eventNumber: this._eventNumber
	, resolveLinkTos: this._resolveLinkTos
	, requireMaster: this._requireMaster
	})
}
	
ReadEvent.prototype.transformResponse = function(payload) {
	return {
		Status: payload.result
	, Event: payload.result === 'Success' ? eventPayloads.toResolvedEvent(payload.event) : null
	, Stream: this._stream
	, EventNumber: this._eventNumber
	}
}

ReadEvent.prototype.toString = function() {
	return 'Stream: ' + this._stream
				+ ', EventNumber: ' + this._eventNumber
				+ ', ResolveLinkTos: ' + this._resolveLinkTos
				+ ', RequireMaster: ' + this._requireMaster
}
