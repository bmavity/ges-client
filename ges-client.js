var tcpConnect = require('./tcp/connection')

module.exports = createConnection


function createConnection(cb) {
	tcpConnect(function(err, connection) {
		if(err) return cb(err)

		cb(null, connection)
	})
}