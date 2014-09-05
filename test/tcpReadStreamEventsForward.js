var client = require('../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')

describe('ges-client, when properly reading from a stream', function() {
	var connection
		, es
		, readError
		, readResult
		, events = [{
					EventId: uuid.v4()
				, EventType: 'FirstEvent'
				, Data: { hi: 'bye' }
				, Metadata: { metaHi: 'metaBye' }
				}
			, {
					EventId: uuid.v4()
				, EventType: 'FirstEvent'
				, Data: { hi: 'everything' }
				, Metadata: { metaHi: 'meta meta everything' }
				}
			, {
					EventId: uuid.v4()
				, EventType: 'AnotherEvent'
				, Data: { total: 5 }
				, Metadata: { happened: '07/05/1973' }
			}]

	before(function(done) {
		ges({ tcpPort: 2345 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 2345 })

			connection.on('connect', function() {
				var stream = 'read_event_stream_forward_should_notify_using_status_code_if_stream_not_found' 
					, options = {
							start: 0
						, count: 1
						}
				connection.readStreamEventsForward(stream, options, function(err, result) {
					readError = err
					readResult = result

					done()
				})
			})

			connection.on('error', done)
		})
	})

  it('should notifiy using status code if stream not found', function() {
  	readError.message.should.equal('NoStream')
  })

  after(function(done) {
  	es.on('exit', function(code, signal) {
  		console.log('Exited with ', code, signal)
	  	done()
  	})
  	es.kill()
  })
})