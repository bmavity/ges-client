var client = require('../')
	, memoryEs = require('./inMemoryEs')

describe('ges-client, when invoked without connection args', function() {
	var connection
		, es
		, isConnected = false

	before(function(done) {
		memoryEs(function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client()

			connection.on('connect', function() {
				isConnected = true
				done()
			})

			connection.on('error', done)
		})
	})

  it('should create a connection with the default host and port', function() {
  	(!!connection).should.be.true
  })

  it('should connect', function() {
  	isConnected.should.be.true
  })

  after(function(done) {
  	es.on('exit', function(code, signal) {
  		console.log('Exited with ', code, signal)
	  	done()
  	})
  	es.kill()
  })
})


describe('ges-client, when invoked with incorrect connection args', function() {
	var isConnected = false

	before(function(done) {
		var connection = client({
			port: 4789
		})

		connection.on('connect', function() {
			isConnected = true
			done()
		})

		connection.on('error', function(err) {
			done()
		})
	})

  it('should not connect', function() {
  	isConnected.should.be.false
  })

  after(function(done) {
  	done()
  })
})
