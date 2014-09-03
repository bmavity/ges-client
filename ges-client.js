var tcpConnect = require('./tcp/connection')

module.exports = createConnection


function createConnection(opts) {
	return tcpConnect(opts)
}