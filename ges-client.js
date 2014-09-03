var tcpConnect = require('./tcp/connection')

module.exports = createConnection


function createConnection() {
	return tcpConnect()
}