var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

require('../../shouldExtensions')

describe('read_all_events_backward_should', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 2345 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 2345 }, function(err) {
				if(err) return done(err)

				var appendData = {
							expectedVersion: client.expectedVersion.emptyStream
						, events: createTestEvent(range(0, 20))
						}
				connection.appendToStream('stream', appendData, done)
			})
		})
	})

	it('return_empty_slice_if_asked_to_read_from_start', function(done) {
		var readData = {
					position: client.position.start
				, maxCount: 1
				}
		connection.readAllEventsBackward(readData, function(err, result) {
			if(err) return done(err)

			result.IsEndOfStream.should.be.true
			result.Events.length.should.equal(0)
			done()
		})
	})

  it('return_partial_slice_if_not_enough_events')
  it('return_events_in_reversed_order_compared_to_written')
  it('be_able_to_read_all_one_by_one_until_end_of_stream')
  it('be_able_to_read_events_slice_at_time')

  after(function(done) {
  	connection.close(function() {
	  	es.on('exit', function(code, signal) {
		  	done()
	  	})
	  	es.on('error', done)
	  	es.kill()
  	})
  })
})