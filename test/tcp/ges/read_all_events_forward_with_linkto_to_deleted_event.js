var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_all_events_forward_with_linkto_to_deleted_event', function() {
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
		ges({ tcpPort: 5016 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5016 }, function(err) {
				if(err) return done(err)

				appendData.events = client.createEventData(uuid.v4(), 'testing', true, new Buffer(JSON.stringify({ foo: 4 })))
				connection.appendToStream(deletedStreamName, appendData, function(err) {
					if(err) return done(err)

					appendData.events = client.createEventData(uuid.v4(), client.systemEventTypes.linkTo, false, new Buffer('0@' + deletedStreamName))
					connection.appendToStream(linkedStreamName, appendData, function(err) {
						if(err) return done(err)

						connection.deleteStream(deletedStreamName, { expectedVersion: client.expectedVersion.any } , done)
					})
				})
			})
		})
	})
	
	var readData = {
				start: 0
			, count: 1
			, resolveLinkTos: true
			}

  it('one_event_is_read', function(done) {
  	connection.readStreamEventsForward(linkedStreamName, readData, function(err, readResult) {
  		if(err) return done(err)

  		readResult.Events.length.should.equal(1)
  		done()
  	})
  })

  it('the_linked_event_is_not_resolved', function(done) {
  	connection.readStreamEventsForward(linkedStreamName, readData, function(err, readResult) {
  		if(err) return done(err)

  		should.be.null(readResult.Events[0].Event)
  		done()
  	})
  })

  it('the_link_event_is_included', function(done) {
  	connection.readStreamEventsForward(linkedStreamName, readData, function(err, readResult) {
  		if(err) return done(err)

  		should.not.be.null(readResult.Events[0].OriginalEvent)
  		done()
  	})
  })

  it('the_event_is_not_resolved', function(done) {
  	connection.readStreamEventsForward(linkedStreamName, readData, function(err, readResult) {
  		if(err) return done(err)

  		readResult.Events[0].IsResolved.should.be.false
  		done()
  	})
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