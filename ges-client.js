var tcpConnect = require('./tcp/connection')
	, expectedVersion = {}

module.exports = createConnection


Object.defineProperties(module.exports, {
	expectedVersion: { value: expectedVersion }
})

Object.defineProperties(expectedVersion, {
	any: { value: -2 }
, noStream: { value: -1 }
, emptyStream: { value: -1 }
})


function createConnection(opts) {
	return tcpConnect(opts)
}