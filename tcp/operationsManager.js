var uuid = require('node-uuid')
	, parser = require('./messageParser')

module.exports = OperationsManager


function OperationsManager() {
	if(!(this instanceof OperationsManager)) {
		return new OperationsManager()
	}

	this._activeOperations = {}
	this._waitingOperations = []
}

OperationsManager.prototype.enqueueOperation = function(operation, cb) {
	this._waitingOperations.push({
		operation: operation
	, cb: cb
	})
	setImmediate(cb)
}

OperationsManager.prototype.getActiveOperation = function(correlationId) {
	return this._activeOperations[correlationId]
}

OperationsManager.prototype.scheduleOperation = function(operation, tcpConnection, cb) {
	var correlationId = uuid.v4()
		, operationName = operation.name
		, auth = null

	this._activeOperations[correlationId] = {
		operation: operation
	, cb: cb
	}

	var payload = parser.serialize(operationName, operation.data)

	tcpConnection.enqueueSend({
		messageName: operationName
	, correlationId: correlationId
	, payload: payload
	, auth: auth
	})
}
