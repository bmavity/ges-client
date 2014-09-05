var client = require('../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')

describe('read event stream forward should', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 2345 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 2345 })

			connection.on('connect', function() {
				done()
			})

			connection.on('error', done)
		})
	})

	it('throw if count le zero', function(done) {
		var stream = 'read_event_stream_forward_should_throw_if_count_le_zero' 
			, options = {
					start: 0
				, count: 0
				}
		connection.readStreamEventsForward(stream, options, function(err, result) {
	  	err.message.should.endWith('count must be positive.')
			done()
		})
  })

	it('throw if start lt zero', function(done) {
		var stream = 'read_event_stream_forward_should_throw_if_start_lt_zero' 
			, options = {
					start: -1
				, count: 1
				}
		connection.readStreamEventsForward(stream, options, function(err, result) {
	  	err.message.should.endWith('start must be non-negative.')
			done()
		})
  })

  it('notifiy using status code if stream not found', function(done) {
		var stream = 'read_event_stream_forward_should_notify_using_status_code_if_stream_not_found' 
			, options = {
					start: 0
				, count: 1
				}
		connection.readStreamEventsForward(stream, options, function(err, result) {
			if(err) return done(err)

	  	result.Status.should.equal('NoStream')
			done()
		})
  })

  after(function(done) {
  	es.on('exit', function(code, signal) {
  		console.log('Exited with ', code, signal)
	  	done()
  	})
  	es.kill()
  })
})


		var events = [{
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
