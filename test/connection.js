var client = require('../')
	, memoryEs = require('./inMemoryEs')

describe('ges-client, when invoked without connection args', function() {
	var connection
		, es
		, isConnected = false

	before(function(done) {
		es = memoryEs()

		connection = client()

		connection.on('connect', function() {
			isConnected = true
			done()
		})
	})

  it('should create a connection', function() {
  	(!!connection).should.be.true
  })

  it('should connect', function() {
  	isConnected.should.be.true
  })

  after(function(done) {
  	es.kill()
  	done()
  })
})
