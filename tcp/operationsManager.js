var uuid = require('node-uuid')
	, ensure = require('../ensure')
	, parser = require('./messageParser')
	, getIsoDate = require('./getIsoDate')

module.exports = OperationsManager
module.exports.item = OperationItem

function LogDebug(msg) {
	//console.log(msg)
}


function OperationsManager(connectionName, connectionSettings) {
	if(!(this instanceof OperationsManager)) {
		return new OperationsManager(connectionName, connectionSettings)
	}

	Object.defineProperty(this, '_connectionName', { value: connectionName })
	Object.defineProperty(this, '_settings', { value: connectionSettings })

	this._activeOperations = {}
	this._waitingOperations = []
	this._retryPendingOperations = []

	this._totalOperationCount = 0

	this._settings = {
		maxConcurrentItems: 1000
	}
}

OperationsManager.prototype._getActive = function() {
	var active = this._activeOperations
	return Object.keys(active).map(function(key) { return active[key] })
}

OperationsManager.prototype.cleanUp = function() {
	var err = new Error('Connection ' + this._connectionName + ' was closed.')
		, all = this._getActive().concat(this._waitingOperations).concat(this._retryPendingOperations)

	all.forEach(function(operationItem) {
		operationItem.operation.fail(err)
	})

  this._activeOperations = {}
  this._waitingOperations = []
  this._retryPendingOperations = []

  this._totalOperationCount = 0
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

  LogDebug('RemoveOperation SUCCEEDED for ' + operationItem.toString())

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
	Object.defineProperty(this, 'createdTime', { value: getIsoDate() })

	this.retryCount = 0
  this.lastUpdated = getIsoDate() 
}

OperationItem.prototype.toTcpMessage = function() {
	return {
		messageName: this.operation.requestMessage
	, correlationId: this.correlationId
	, payload: this.operation.toRequestPayload()
	, userCredentials: this.operation.userCredentials
	}
}

OperationItem.prototype.toString = function() {
	return 'Operation {0}' + this.operation.requestMessage
		+ ' (' + this.correlationId
		+ '): ' + this.operation.toString()
		+ ', retry count: ' + this.retryCount
		+ ', created: ' + this.createdTime
		+ ', last updated: ' + this.lastUpdated
}
