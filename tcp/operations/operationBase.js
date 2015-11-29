var inspection = require('./inspection')
	, messageParser = require('../messageParser')

module.exports.OperationBase = OperationBase

function LogDebug(msg) {
	console.log(message)
}


function OperationBase(operationData) {
	Object.defineProperty(this, 'userCredentials', { value: operationData.auth })
	Object.defineProperty(this, '_cb', { value: operationData.cb })

	this._completed = false
}

OperationBase.prototype.fail = function(err) {
	if(this._completed) return

	var me = this
	this._completed = true
	setImmediate(function() {
		me._cb(err)
	})
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
	if(package.messageName === expectedCommand) {
		throw new Error("Command shouldn't be " + package.messageName)
	}

	LogDebug('Unexpected TcpCommand received.\n'
    + 'Expected: ' + expectedCommand
    + ', Actual: ' + package.messageName
    + ', Flags: ' + package.flags
    + ', CorrelationId: ' + package.correlationId
    + '\nOperation (' + this.requestMessage
    + '): ' + this.toString()
		+ '\nTcpPackage Data Dump:\n' + package.payload.toString()
	)

	this._fail(new Error('Command Not Expected: [' + expectedCommand + ', ' + package.messageName + ']'))
  return new inspection(inspection.decision.EndOperation, 'Unexpected command - ' + package.messageName)
}

OperationBase.prototype._serialize = function(messageData) {
	return messageParser.serialize(this.requestType, messageData)
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

