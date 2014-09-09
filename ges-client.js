var tcpConnect = require('./tcp/connection')
	, expectedVersion = {}
	, streamPosition = {}

module.exports = createConnection


Object.defineProperties(module.exports, {
	expectedVersion: { value: expectedVersion }
, maxRecordCount: { value: 2147483647 }
, streamPosition: { value: streamPosition }
})

Object.defineProperties(streamPosition, {
	start: { value: 0 }
, end: { value: -1 }
})

Object.defineProperties(expectedVersion, {
	any: { value: -2 }
, noStream: { value: -1 }
, emptyStream: { value: -1 }
})


function createConnection(opts, cb) {
	return tcpConnect(opts, cb)
}