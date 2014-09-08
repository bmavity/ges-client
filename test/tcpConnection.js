var client = require('../')
	, memoryEs = require('ges-test-helper')

describe('ges-client, when invoked without connection args', function() {
	var connection
		, es
		, isConnected = false
		, isDone = false

	before(function(done) {
		memoryEs(function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client()

	  	es.on('error', console.log)
			connection.on('connect', function() {
				isConnected = true
				isDone = true
				done()
			})

			connection.on('error', function() {
				if(!isDone) {
					isDone = true
					done()
				}
			})
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
  	es.on('error', console.log)
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


describe('ges-client, when connected', function() {
	this.timeout(15000)

	var connection
		, es
		, wasOpenFor20Seconds = false

	before(function(done) {
		memoryEs({ tcpPort: 4567 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 4567 })

			connection.on('connect', function() {
				setTimeout(function() {
					wasOpenFor20Seconds = true
					done()
				}, 8000)
			})

			connection.on('error', done)
		})
	})

  it('should not disconnect', function() {
  	wasOpenFor20Seconds.should.be.true
  })

  after(function(done) {
  	es.on('exit', function(code, signal) {
  		console.log('Exited with ', code, signal)
	  	done()
  	})
  	es.kill()
  })
})
