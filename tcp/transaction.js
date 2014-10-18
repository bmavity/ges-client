

module.exports = EsTransaction


function EsTransaction(transactionId, userCredentials, connection) {
	if(!(this instanceof EsTransaction)) {
		return new EsTransaction(transactionId, userCredentials, connection)
	}

	this._transactionId = transactionId
	this._connection = connection
	this._userCredentials = userCredentials

	this._isCommitted = false
	this._isRolledBack = false
}

EsTransaction.prototype.commit = function(cb) {
	this._isCommitted = true
	this._connection.commitTransaction({
		transactionId: this._transactionId
	, auth: this._userCredentials
	}, cb)
}

EsTransaction.prototype.write = function(events, cb) {
	if(!cb) {
		cb = events
		events = []
	}
	this._connection.transactionalWrite({
		transactionId: this._transactionId
	, events: events
	, auth: this._userCredentials
	}, cb)
}
