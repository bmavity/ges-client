var client = require('../')
	, memoryEs = require('./memory_es')

describe('ges-client, when invoked without connection args', function() {
	var connection
		, es

	before(function(done) {
		es = memoryEs()

		client(function(err, con) {
			if(err) return done(err)
			
			connection = con
			done()
		})
	})

  it('should produce a connection', function() {
  	(!!connection).should.be.true
  })

  after(function(done) {
  	es.kill()
  	done()
  })
})
