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
		, testEvents = createTestEvent(range(0, 20))
		, reversedEvents = testEvents.reduce(function(rev, evt) { rev.unshift(evt); return rev; }, [])

	before(function(done) {
		ges({ tcpPort: 2345 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 2345 }, function(err) {
				if(err) return done(err)

				var setData = {
							expectedMetastreamVersion: -1
						, metadata: client.createStreamMetadata({
							  acl: {
									readRoles: client.systemRoles.all
								}
							})
						, auth: {
								username: client.systemUsers.admin
							, password: client.systemUsers.defaultAdminPassword
							}
						}

				connection.setStreamMetadata('$all', setData, function(err) {
					if(err) return done(err)
						
					var appendData = {
								expectedVersion: client.expectedVersion.emptyStream
							, events: testEvents
							}
					connection.appendToStream('stream', appendData, done)
				})
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

  it('return_events_in_reversed_order_compared_to_written', function(done) {
		var readData = {
					position: client.position.end
				, maxCount: 20
				}
		connection.readAllEventsBackward(readData, function(err, result) {
			if(err) return done(err)

			var nonSystemEvents = result.Events.filter(isNotFromSystemStream)
			
			// This fails due to system events appearing inside all stream.
			// How does this pass in C# land?
			nonSystemEvents.should.matchEvents(reversedEvents)
			done()
		})
	})

  it('be_able_to_read_all_one_by_one_until_end_of_stream', function(done) {
  	var nonSystemEvents = []
  		, currentPosition = client.position.end

  	function readNextEvent() {
			var readData = {
						position: currentPosition
					, maxCount: 1
					}
			connection.readAllEventsBackward(readData, function(err, result) {
				if(err) return done(err)

				if(result.IsEndOfStream) {
					compareEvents()
				} else {
					if(isNotFromSystemStream(result.Events[0])) {
						nonSystemEvents.push(result.Events[0])
					}
					currentPosition = result.NextPosition
					readNextEvent()
				}
			})
  	}

  	function compareEvents() {
			nonSystemEvents.should.matchEvents(reversedEvents)
			done()
  	}

  	readNextEvent()
	})

  it('be_able_to_read_events_slice_at_time', function(done) {
  	var nonSystemEvents = []
  		, currentPosition = client.position.end

  	function readNextEvent() {
			var readData = {
						position: currentPosition
					, maxCount: 5
					}
			connection.readAllEventsBackward(readData, function(err, result) {
				if(err) return done(err)

				if(result.IsEndOfStream) {
					compareEvents()
				} else {
					nonSystemEvents = nonSystemEvents.concat(result.Events.filter(isNotFromSystemStream))
					currentPosition = result.NextPosition
					readNextEvent()
				}
			})
  	}

  	function compareEvents() {
			nonSystemEvents.should.matchEvents(reversedEvents)
			done()
  	}

  	readNextEvent()
	})

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

function isNotFromSystemStream(evt) {
	return !client.systemStreams.isSystemStream(evt.Event.EventStreamId)
}

