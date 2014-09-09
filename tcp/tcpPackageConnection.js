var net = require('net')

module.exports = function(opts) {
	var socket = net.connect(opts.endPoint)

	return socket
}