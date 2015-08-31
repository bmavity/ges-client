var client = require('../../../')
	, ges = require('ges-test-helper').external
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('when_committing_empty_transaction', function() {
	var es
		, connection
		, firstEvent = createTestEvent()
		, stream = 'test-stream'

	beforeEach(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			client(settings, function(err, con) {
				if(err) return done(err)

				connection = con
				es.addConnection(connection)

				var appendOptions = {
							expectedVersion: client.expectedVersion.noStream
						, events: [ firstEvent, createTestEvent(), createTestEvent() ]
						}

				connection.appendToStream(stream, appendOptions, function(err, appendResult) {
					if(err) return done(err)

					appendResult.NextExpectedVersion.should.equal(2)
					var transactionOptions = {
								expectedVersion: 2
							}

					connection.startTransaction(stream, transactionOptions, function(err, transaction) {
						transaction.commit(function(err, commitResult) {
							if(err) return done(err)

							commitResult.NextExpectedVersion.should.equal(2)
							done()
						})
					})
				})
			})
		})
	})

  it('following_append_with_correct_expected_version_are_commited_correctly', function(done) {
  	var appendOptions = {
  				expectedVersion: 2
  			, events: [ createTestEvent(), createTestEvent() ]
		  	}
  	connection.appendToStream(stream, appendOptions, function(err, appendResult) {
  		if(err) return done(err)

  		appendResult.NextExpectedVersion.should.equal(4)
  		var readOptions = {
		  			start: 0
		  		, count: 100
		  		}

  		connection.readStreamEventsForward(stream, readOptions, function(err, readResult) {
  			if(err) return done(err)

  			readResult.Status.should.equal('Success')
  			readResult.Events.length.should.equal(5)
  			for(var i = 0; i < 5; i += 1) {
  				readResult.Events[i].OriginalEventNumber.should.equal(i)
  			}
  			done()
  		})
  	})
  })

  it('following_append_with_expected_version_any_are_commited_correctly', function(done) {
  	var appendOptions = {
  				expectedVersion: client.expectedVersion.any
  			, events: [ createTestEvent(), createTestEvent() ]
		  	}
  	connection.appendToStream(stream, appendOptions, function(err, appendResult) {
  		if(err) return done(err)

  		appendResult.NextExpectedVersion.should.equal(4)
  		var readOptions = {
		  			start: 0
		  		, count: 100
		  		}

  		connection.readStreamEventsForward(stream, readOptions, function(err, readResult) {
  			if(err) return done(err)

  			readResult.Status.should.equal('Success')
  			readResult.Events.length.should.equal(5)
  			for(var i = 0; i < 5; i += 1) {
  				readResult.Events[i].OriginalEventNumber.should.equal(i)
  			}
  			done()
  		})
  	})
  })

  it('committing_first_event_with_expected_version_no_stream_is_idempotent', function(done) {
  	var appendOptions = {
  				expectedVersion: client.expectedVersion.noStream
  			, events: firstEvent
		  	}
  	connection.appendToStream(stream, appendOptions, function(err, appendResult) {
  		if(err) return done(err)

  		appendResult.NextExpectedVersion.should.equal(0)
  		var readOptions = {
		  			start: 0
		  		, count: 100
		  		}

  		connection.readStreamEventsForward(stream, readOptions, function(err, readResult) {
  			if(err) return done(err)

  			readResult.Status.should.equal('Success')
  			readResult.Events.length.should.equal(3)
  			for(var i = 0; i < 3; i += 1) {
  				readResult.Events[i].OriginalEventNumber.should.equal(i)
  			}
  			done()
  		})
  	})
  })

  it('trying_to_append_new_events_with_expected_version_no_stream_fails', function(done) {
  	var appendOptions = {
  				expectedVersion: client.expectedVersion.noStream
  			, events: createTestEvent()
		  	}
  	connection.appendToStream(stream, appendOptions, function(err, appendResult) {
  		should.not.be.null(err)
  		err.message.should.equal('Wrong expected version.')
			done()
  	})
  })

  afterEach(function(done) {
  	es.cleanup(done)
  })
})
