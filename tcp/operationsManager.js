var uuid = require('node-uuid')
    , operations = require('./operations')
    , parser = require('./messageParser');

module.exports = OperationsManager;


function OperationsManager() {
    if (!(this instanceof OperationsManager)) {
        return new OperationsManager()
    }

    this._activeOperations = {};
    this._waitingOperations = []
}

OperationsManager.prototype.completeActiveOperation = function (correlationId) {
    delete this._activeOperations[correlationId]
};

OperationsManager.prototype.enqueueOperation = function (operation) {
    return this._waitingOperations.push(operation)
};

OperationsManager.prototype.getActiveOperation = function (correlationId) {
    return this._activeOperations[correlationId]
};

OperationsManager.prototype.scheduleOperation = function (operationData, tcpConnection) {
    var correlationId = uuid.v4()
        , operation = operations(operationData, this);

    this._activeOperations[correlationId] = operation;

    tcpConnection.enqueueSend(operation.toTcpMessage(correlationId))
};
