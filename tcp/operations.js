
module.exports = {
	appendToStream: require('./operations/appendToStreamOperation')
, commitTransaction: require('./operations/commitTransactionOperation')
, deleteStream: require('./operations/deleteStreamOperation')
, readAllEventsBackward: require('./operations/readAllEventsBackwardOperation')
, readAllEventsForward: require('./operations/readAllEventsForwardOperation')
, readStreamEventsBackward: require('./operations/readStreamEventsBackwardOperation')
, readEvent: require('./operations/readEventOperation')
, readStreamEventsForward: require('./operations/readStreamEventsForwardOperation')
, startTransaction: require('./operations/startTransactionOperation')
, transactionalWrite: require('./operations/transactionalWriteOperation')

, inspection: require('./operations/inspection')
}
