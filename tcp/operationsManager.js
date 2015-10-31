var uuid = require('node-uuid')
	, ensure = require('../ensure')
	, parser = require('./messageParser')

module.exports = OperationsManager
module.exports.item = OperationItem

function LogDebug(msg) {
	//console.log(msg)
}


function OperationsManager() {
	if(!(this instanceof OperationsManager)) {
		return new OperationsManager()
	}

	this._activeOperations = {}
	this._waitingOperations = []

	this._totalOperationCount = 0

	this._settings = {
		maxConcurrentItems: 1000
	}
}

OperationsManager.prototype.cleanUp = function() {
	console.log('CLEANING UP')
}

OperationsManager.prototype.completeActiveOperation = function(correlationId) {
	delete this._activeOperations[correlationId]
}

OperationsManager.prototype.enqueueOperation = function(operationItem) {
	return this._waitingOperations.push(operationItem)
}

OperationsManager.prototype.getActiveOperation = function(correlationId) {
	return this._activeOperations[correlationId]
}

OperationsManager.prototype.removeOperation = function(operationItem) {
	var correlationId = operationItem.correlationId
		, activeOperation = this._activeOperations[correlationId]
	if(!activeOperation) {
    LogDebug('RemoveOperation FAILED for ' + operationItem.toString())
    return false
  }
  delete this._activeOperations[correlationId]

  LogDebug("RemoveOperation SUCCEEDED for {0}", operationItem.toString())

  this._setTotalOperationCount()
  return true
}

OperationsManager.prototype.scheduleOperation = function(operationItem, tcpConnection) {
	this._activeOperations[operationItem.correlationId] = operationItem
	
	tcpConnection.enqueueSend(operationItem.toTcpMessage())
}

OperationsManager.prototype.scheduleWaitingOperations = function(tcpConnection) {
	ensure.exists(tcpConnection, 'tcpConnection')

	var activeCount = Object.keys(this._activeOperations).length

  while(this._waitingOperations.length > 0 && activeCount < this._settings.maxConcurrentItems) {
    this.scheduleOperation(this._waitingOperations.shift(), tcpConnection)
  }
  this._setTotalOperationCount()
}

OperationsManager.prototype._setTotalOperationCount = function() {
  var activeOperationCount = Object.keys(this._activeOperations).length
  this._totalOperationCount = activeOperationCount + this._waitingOperations.length
}


function OperationItem(operation, maxRetries, timeout) {
	if(!(this instanceof OperationItem)) {
		return new OperationItem(operation, maxRetries, timeout)
	}

	Object.defineProperty(this, 'correlationId', { value: uuid.v4() })
	Object.defineProperty(this, 'operation', { value: operation })
	Object.defineProperty(this, 'maxRetries', { value: maxRetries })
	Object.defineProperty(this, 'timeout', { value: timeout })
}

OperationItem.prototype.toTcpMessage = function() {
	return {
		messageName: this.operation.requestMessage
	, correlationId: this.correlationId
	, payload: this.operation.toRequestPayload()
	, auth: this.operation.auth
	}
}

OperationItem.prototype.toString = function() {
	/*
	"Operation {0} ({1:B}): {2}, retry count: {3}, created: {4:HH:mm:ss.fff}, last updated: {5:HH:mm:ss.fff}",
                                 Operation.GetType().Name, CorrelationId, Operation, RetryCount, CreatedTime, LastUpdated);
*/
	return this.operation.toString()
}
