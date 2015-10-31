var uuid = require('node-uuid')
	, util = require('util')
	, inspection = require('./inspection')
	, messageParser = require('./messageParser')
	, position = require('./position')
	, eventPayloads = require('./eventPayloads')

module.exports = {
	appendToStream: AppendToStream
, readStreamEventsForward: ReadStreamEventsForward
}

function OperationBase(operationData) {
	Object.defineProperty(this, '_cb', { value: operationData.cb })

	this._completed = false
}

OperationBase.prototype.fail = function(err) {
	if(this._completed) return

	this._completed = true
	this._cb(err)
}

OperationBase.prototype.inspectPackage = function(package) {
	try {
    if(package.messageName === this.responseMessage) {
      this._response = messageParser.parse(this.responseType, package.payload)
      return this.inspectResponse(this._response)
    }

    switch (package.messageName) {
      case 'NotAuthenticated': return this.inspectNotAuthenticated(package)
      case 'BadRequest': return this.inspectBadRequest(package)
      case 'NotHandled': return this.inspectNotHandled(package)
      default: return this.inspectUnexpectedCommand(package, this.responseMessage)
    }
  }
  catch (ex) {
    this.fail(ex)
    return new inspection(inspection.decision.EndOperation, 'Exception - ' + ex.message)
  }
}

OperationBase.prototype.inspectResponse = function(response) {
	var resultInspection = this._inspections[response.result]
	if(!resultInspection) {
		throw new Error('Cannot inspect result: ' + response.result)
	}
	return resultInspection.call(this, response)
}

OperationBase.prototype.inspectNotAuthenticated = function(package) {
	var message = package.payload.toString('UTF8') || 'Authentication error'
  this.fail(new Error(message))
  return new inspection(inspection.decision.EndOperation, 'NotAuthenticated')
}

OperationBase.prototype.inspectBadRequest = function(package) {
	var message = package.payload.toString('UTF8') || '<no message>'
	console.log('message: ' + message)
	this.fail(new Error(message))
  return new inspection(inspection.decision.EndOperation, 'BadRequest - ' + message)
}

OperationBase.prototype.inspectNotHandled = function(package) {
	/*
	var message = package.Data.Deserialize<ClientMessage.NotHandled>()
            switch (message.Reason)
            {
                case ClientMessage.NotHandled.NotHandledReason.NotReady:
                    return new InspectionResult(InspectionDecision.Retry, 'NotHandled - NotReady')

                case ClientMessage.NotHandled.NotHandledReason.TooBusy:
                    return new InspectionResult(InspectionDecision.Retry, 'NotHandled - TooBusy')

                case ClientMessage.NotHandled.NotHandledReason.NotMaster:
                    var masterInfo = message.AdditionalInfo.Deserialize<ClientMessage.NotHandled.MasterInfo>()
                    return new InspectionResult(InspectionDecision.Reconnect, 'NotHandled - NotMaster',
                                                masterInfo.ExternalTcpEndPoint, masterInfo.ExternalSecureTcpEndPoint)

                default:
                    Log.Error('Unknown NotHandledReason: {0}.', message.Reason)
                    return new InspectionResult(InspectionDecision.Retry, 'NotHandled - <unknown>')
            }
            */
}

OperationBase.prototype.inspectUnexpectedCommand = function(package, expectedCommand) {
	/*
	if (package.Command == expectedCommand)
                throw new ArgumentException(string.Format('Command shouldn't be {0}.', package.Command))

            Log.Error('Unexpected TcpCommand received.\n'
                      + 'Expected: {0}, Actual: {1}, Flags: {2}, CorrelationId: {3}\n'
                      + 'Operation ({4}): {5}\n'
                      +'TcpPackage Data Dump:\n{6}', 
                      expectedCommand, package.Command, package.Flags, package.CorrelationId, 
                      GetType().Name, this, Helper.FormatBinaryDump(package.Data))

            Fail(new CommandNotExpectedException(expectedCommand.ToString(), package.Command.ToString()))
            return new InspectionResult(InspectionDecision.EndOperation, string.Format('Unexpected command - {0}', package.Command.ToString()))
            */
}

OperationBase.prototype.succeed = function() {
	if(this._completed) return

	this._completed = true
	if(this._response) {
		this._cb(null, this.transformResponse(this._response))
	} else {
		this._cb(new Error('No Operation Result to return.'))
	}
}


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
	return messageParser.serialize(this.requestType, {
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




function ReadStreamEventsForward(operationData) {
	if(!(this instanceof ReadStreamEventsForward)) {
		return new ReadStreamEventsForward(operationData)
	}
	OperationBase.call(this, operationData)

	Object.defineProperty(this, 'requestMessage', { value: 'ReadStreamEventsForward' })
	Object.defineProperty(this, 'requestType', { value: 'ReadStreamEvents' })
	Object.defineProperty(this, 'responseMessage', { value: 'ReadStreamEventsForwardCompleted' })
	Object.defineProperty(this, 'responseType', { value: 'ReadStreamEventsCompleted' })

	Object.defineProperty(this, '_stream', { value: operationData.stream })
	Object.defineProperty(this, '_requireMaster', { value: !!operationData.requireMaster })

	Object.defineProperty(this, '_fromEventNumber', { value: operationData.data.start })
	Object.defineProperty(this, '_maxCount', { value: operationData.data.count })
	Object.defineProperty(this, '_resolveLinkTos', { value: operationData.data.resolveLinkTos })

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
util.inherits(ReadStreamEventsForward, OperationBase)

ReadStreamEventsForward.prototype.toRequestPayload = function() {
	return messageParser.serialize(this.requestType, {
		eventStreamId: this._stream
	, fromEventNumber: this._fromEventNumber
	, maxCount: this._maxCount
	, resolveLinkTos: !!this._resolveLinkTos
	, requireMaster: !!this._requireMaster
	})
}
	
ReadStreamEventsForward.prototype.transformResponse = function(payload) {
	var events = payload.events || []
	return {
		Status: payload.result
	, Events: events.map(eventPayloads.toResolvedEvent)
	, NextEventNumber: payload.nextEventNumber
	, LastEventNumber: payload.lastEventNumber
	, IsEndOfStream: payload.isEndOfStream
	}
}

ReadStreamEventsForward.prototype.toString = function() {
	return 'Stream: ' + this._stream + ', ExpectedVersion: ' + this._expectedVersion
}








var operations = {
	DeleteStream: function(operationData) {
		return {
		  auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'DeleteStream'
		, toRequestPayload: function() {
				var payload = operationData.data
				return messageParser.serialize('DeleteStream', {
					eventStreamId: operationData.stream
				, expectedVersion: payload.expectedVersion
				, requireMaster: !!payload.requireMaster
				, hardDelete: !!payload.hardDelete
				})
			}
		, responseType: 'DeleteStreamCompleted'
		, toResponseObject: function(payload) {
			  return {
			  	Status: payload.result
			  , LogPosition: position(payload)
				}
			}
		}
	}
, ReadAllEventsBackward: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadAllEventsBackward'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadAllEvents', {
					commitPosition: payload.position.commitPosition
				, preparePosition: payload.position.preparePosition
				, maxCount: payload.maxCount
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadAllEventsCompleted'
		, toResponseObject: function(payload) {
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
		}
	}
, ReadAllEventsForward: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadAllEventsForward'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadAllEvents', {
					commitPosition: payload.position.commitPosition
				, preparePosition: payload.position.preparePosition
				, maxCount: payload.maxCount
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadAllEventsCompleted'
		, toResponseObject: function(payload) {
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
		}
	}
, ReadEvent: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadEvent'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadEvent', {
					eventStreamId: operationData.stream
				, eventNumber: payload.eventNumber
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadEventCompleted'
		, toResponseObject: function(payload) {
				return {
					Status: payload.result
				, Event: payload.result === 'Success' ? eventPayloads.toResolvedEvent(payload.event) : null
				, Stream: operationData.stream
				, EventNumber: operationData.data.eventNumber
				}
			}
		}
	}
, ReadStreamEventsBackward: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'ReadStreamEventsBackward'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('ReadStreamEvents', {
					eventStreamId: operationData.stream
				, fromEventNumber: payload.start
				, maxCount: payload.count
				, resolveLinkTos: !!payload.resolveLinkTos
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'ReadStreamEventsCompleted'
		, toResponseObject: function(payload) {
				var events = payload.events || []
				return {
					Status: payload.result
				, Events: events.map(eventPayloads.toResolvedEvent)
				, NextEventNumber: payload.nextEventNumber
				, LastEventNumber: payload.lastEventNumber
				, IsEndOfStream: payload.isEndOfStream
				}
			}
		}
	}
, StartTransaction: function(operationData) {
		return {
			auth: operationData.auth
		, cb: operationData.cb
		, requestType: 'TransactionStart'
		, toRequestPayload: function(payload) {
				var payload = operationData.data

				return messageParser.serialize('TransactionStart', {
					eventStreamId: operationData.stream
				, expectedVersion: payload.expectedVersion
				, requireMaster: !!payload.requireMaster
		  	})
	  	}
		, responseType: 'TransactionStartCompleted'
		, toResponseObject: function(payload) {
				return {
					Result: payload.result
				, TransactionId: payload.transactionId
				, Message: payload.message
				}
			}
		}
	}
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
}
