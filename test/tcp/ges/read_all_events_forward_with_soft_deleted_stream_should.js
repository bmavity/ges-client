var client = require('../../../')
	, ges = require('ges-test-helper').external
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_all_events_forward_with_soft_deleted_stream_should', function() {
	var es
		, connection
		, testEvents = createTestEvent(range(0, 20))

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, function(err) {
				if(err) return done(err)

				es.addConnection(connection)

				var setData = {
							expectedMetastreamVersion: client.expectedVersion.emptyStream
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
					connection.appendToStream('stream', appendData, function(err) {
						if(err) return done(err)
						var deleteData = {
									expectedVersion: client.expectedVersion.any
								, hardDelete: false
								}

						connection.deleteStream('stream', deleteData, done)
					})
				})
			})
		})
	})

  it('ensure_deleted_stream', function(done) {
  	connection.readStreamEventsForward('stream', { start: 0, count: 100 }, function(err, readResult) {
  		if(err) return done(err)

  		readResult.Status.should.equal('NoStream')
  		readResult.Events.length.should.equal(0)
  		done()
  	})
  })

  it('returns_all_events_including_tombstone', function(done) {
  	connection.readAllEventsForward({ position: client.position.start, maxCount: 100 }, function(err, readResult) {
  		if(err) return done(err)

  		readResult.Events.should.matchEvents(testEvents)

  		var lastEvent = readResult.Events.pop().Event
  		lastEvent.EventStreamId.should.equal('$$stream')
  		lastEvent.EventType.should.equal(client.systemEventTypes.streamMetadata)
  		var metadata = client.createStreamMetadata(lastEvent.Data)
  		metadata.TruncateBefore.should.equal(client.eventNumber.deletedStream)

  		done()
  	})
  })


  after(function(done) {
  	es.cleanup(done)
  })
})