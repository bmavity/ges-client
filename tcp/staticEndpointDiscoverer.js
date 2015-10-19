var ensure = require('../ensure')

module.exports = StaticEndpointDiscoverer


function StaticEndpointDiscoverer(endpoint) {
	ensure.exists(endpoint, 'endpoint')

	if(!(this instanceof StaticEndpointDiscoverer)) {
		return new StaticEndpointDiscoverer(endpoint)
	}

	this._endpoint = endpoint
}

StaticEndpointDiscoverer.prototype.discover = function(failedEndpoint, cb) {
	var me = this
	setImmediate(function() {
		cb(null, {
			tcpEndpoint: me._endpoint
		})
	})
}
