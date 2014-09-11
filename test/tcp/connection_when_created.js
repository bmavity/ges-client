var client = require('../../')
	, ges = require('ges-test-helper')

describe('connection, when created', function() {
	var es

	before(function(done) {
		ges({ tcpPort: 6000 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			done()
		})
	})

	it('with a callback, should be connected when callback is called', function(done) {
		client({ port: 6000 }, function(err, connection) {
			(err === null).should.be.true
			connection.isInState('Connected').should.be.true
			connection.close(done)
		})
	})

	it('without a callback, should raise connect event with endpoint as data', function(done) {
		var connection = client({ port: 6000 })
		
		connection.on('connect', function(message) {
			message.endPoint.port.should.equal(6000)
			connection.isInState('Connected').should.be.true
			connection.close(done)
		})
	})

	it('without a callback and with requireExplicitConnection flag set, should raise connect event with endpoint as data', function(done) {
		var connection = client({
					port: 6000
				, requireExplicitConnection: true
				})
		
		connection.on('connect', function(message) {
			message.endPoint.port.should.equal(6000)
			connection.isInState('Connected').should.be.true
			connection.close(done)
		})

		connection.connect()
	})

	it('with a callback and with requireExplicitConnection flag set, should be connected when callback is called', function(done) {
		var con = client({ port: 6000, requireExplicitConnection: true }, function(err, connection) {
			(err === null).should.be.true
			connection.isInState('Connected').should.be.true
			connection.close(done)
		})

		con.connect()
	})

  after(function(done) {
  	es.on('exit', function(code, signal) {
	  	done()
  	})
  	es.on('error', done)
  	es.kill()
  })
})
