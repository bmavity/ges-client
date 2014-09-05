var client = require('../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')

describe('ges-client, when writing to a stream with the wrong expected version', function() {
	var connection
		, es
		, writeError
		, writeResult
		, events = [{
				EventId: uuid.v4()
			, EventType: 'FirstEvent'
			, Data: { hi: 'bye' }
			, Metadata: { metaHi: 'metaBye' }
			}]

	before(function(done) {
		ges({ tcpPort: 6789 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 6789 })

			connection.on('connect', function() {
				connection.appendToStream('testy-1', events, function(err, result) {
					writeError = err
					writeResult = result
					done()
				})
			})

			connection.on('error', done)
		})
	})

  it('should have wrong expected version error', function() {
  	writeError.message.should.equal('Wrong expected version.')
  })

  after(function(done) {
  	es.on('exit', function(code, signal) {
  		console.log('Exited with ', code, signal)
	  	done()
  	})
  	es.kill()
  })
})