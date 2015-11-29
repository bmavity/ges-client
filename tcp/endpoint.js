
module.exports = Endpoint


function Endpoint(host, port) {
	if(!(this instanceof Endpoint)) {
		return new Endpoint(host, port)
	}

	Object.defineProperty(this, 'host', { value: host })
	Object.defineProperty(this, 'port', { value: port })
}

Endpoint.prototype.toString = function() {
	return this.host ? this.host + ':' + this.port : '<empty endpoint>'
}