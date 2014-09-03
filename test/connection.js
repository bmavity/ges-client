var client = require('../')
	, memoryEs = require('./memory_es')

describe('ges-client, when invoked without connection args', function() {
	var connection
		, es

	before(function(done) {
		es = memoryEs()

		connection = client()
		done()
	})

  it('should create a connection', function() {
  	(!!connection).should.be.true
  })

  after(function(done) {
  	es.kill()
  	done()
  })
})
