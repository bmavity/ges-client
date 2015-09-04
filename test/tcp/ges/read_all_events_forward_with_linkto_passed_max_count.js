var client = require('../../../')
	, ges = require('ges-test-helper').memory
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_all_events_forward_with_linkto_passed_max_count', function() {
	var es
		, connection
		, deletedStreamName = uuid.v4()
		, linkedStreamName = uuid.v4()

	before(function(done) {
		var auth = {
					username: client.systemUsers.admin
				, password: client.systemUsers.defaultAdminPassword
				}
			, appendData = {
					expectedVersion: client.expectedVersion.any
				, auth: auth
				}
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, function(err) {
				if(err) return done(err)

				es.addConnection(connection)

				appendData.events = client.createEventData(uuid.v4(), 'testing1', true, new Buffer(JSON.stringify({ foo: 4 })))
				connection.appendToStream(deletedStreamName, appendData, function(err) {
					if(err) return done(err)
					var setMetadata = {
								expectedMetastreamVersion: client.expectedVersion.any
							, metadata: client.createStreamMetadata({ maxCount: 2 })
							}

					connection.setStreamMetadata(deletedStreamName, setMetadata, function(err) {
						if(err) return done(err)

						appendData.events = client.createEventData(uuid.v4(), 'testing2', true, new Buffer(JSON.stringify({ foo: 4 })))
						connection.appendToStream(deletedStreamName, appendData, function(err) {
							if(err) return done(err)
							
							appendData.events = client.createEventData(uuid.v4(), 'testing3', true, new Buffer(JSON.stringify({ foo: 4 })))
							connection.appendToStream(deletedStreamName, appendData, function(err) {
								if(err) return done(err)

								appendData.events = client.createEventData(uuid.v4(), client.systemEventTypes.linkTo, false, new Buffer('0@' + deletedStreamName))
								connection.appendToStream(linkedStreamName, appendData, done)
							})
						})
					})
				})
			})
		})
	})

  it('one_event_is_read', function(done) {
  	var readData = {
  				start: 0
  			, count: 1
  			, resolveLinkTos: true
  			}
  	connection.readStreamEventsForward(linkedStreamName, readData, function(err, readResult) {
  		if(err) return done(err)

  		readResult.Events.length.should.equal(1)
  		done()
  	})
  })


  after(function(done) {
  	es.cleanup(done)
  })
})