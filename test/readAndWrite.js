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
				connection.appendToStream('testy-1', events, 0, function(err, result) {
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

describe('ges-client, when properly writing to a stream', function() {
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
		ges({ tcpPort: 2345 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 2345 })

			connection.on('connect', function() {
				connection.appendToStream('testy-1', events, -1, function(err, result) {
					if(err) return done(err)
						console.log(result)
					writeResult = result
					done()
				})
			})

			connection.on('error', done)
		})
	})

  it('should result in the correct expected version', function() {
  	writeResult.NextExpectedVersion.should.equal(0)
  })

  it('should result in the correct log position', function() {
  	writeResult.LogPosition.CommitPosition.should.equal(-1)
  	writeResult.LogPosition.PreparePosition.should.equal(-1)
  })

  after(function(done) {
  	es.on('exit', function(code, signal) {
  		console.log('Exited with ', code, signal)
	  	done()
  	})
  	es.kill()
  })
})