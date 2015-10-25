
module.exports = {
	closeConnection: function(reason, exception) {
		return new CloseConnection(reason, exception)
	}
, establishTcpConnection: function(endpoint) {
		return new EstablishTcpConnection(endpoint)
	}
, handleTcpPackage: function(connection, package) {
		return new HandleTcpPackageMessage(connection, package)
	}
, startConnection: function(endpointDiscoverer, cb) {
		return new StartConnection(endpointDiscoverer, cb)
	}
, tcpConnectionEstablished: function(connection) {
		return new TcpConnectionEstablished(connection)
	}
}

function CloseConnection(reason, exception) {
	this.type = 'CloseConnection'
	this.payload = {
		reason: reason
	, exception: exception
	}
}

function EstablishTcpConnection(endpoints) {
	this.type = 'EstablishTcpConnection'
	this.payload = {
		endpoints: endpoints
	}
}

function HandleTcpPackageMessage(connection, package) {
	this.type = 'HandleTcpPackage'
	this.payload = {
		connection: connection
	, package: package
	}
}

function StartConnection(endpointDiscoverer, cb) {
	this.type = 'StartConnection'
	this.payload = {
		endpointDiscoverer: endpointDiscoverer
	, cb: cb
	}
}

function TcpConnectionEstablished(connection) {
	this.type = 'TcpConnectionEstablished'
	this.payload = {
		connection: connection
	}
}
