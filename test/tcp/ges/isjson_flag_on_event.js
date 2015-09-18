var client = require('../../../')
	, ges = require('ges-test-helper').memory
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('isjson_flag_on_event', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

	function getData() {
		return new Buffer(JSON.stringify({ some: 'json' }))
	}

  it('should_be_preserved_with_all_possible_write_and_read_methods', function(done) {
    var stream = 'should_be_preserved_with_all_possible_write_methods'
    	, appendOptions = {
    			expectedVersion: client.expectedVersion.any
    		, events: [
    				client.createEventData(uuid.v4(), 'some-type', true, getData(), null)
    			, client.createEventData(uuid.v4(), 'some-type', true, null, getData())
    			, client.createEventData(uuid.v4(), 'some-type', true, getData(), getData())
    			]
	    	}

    connection.appendToStream(stream, appendOptions, function(err, appendResult) {
    	if(err) return done(err)
    	var transactionOptions = {
    				expectedVersion: client.expectedVersion.any
		    	}

    	connection.startTransaction(stream, transactionOptions, function(err, transaction) {
	    	if(err) return done(err)
    		var events = [
	    				client.createEventData(uuid.v4(), 'some-type', true, getData(), null)
	    			, client.createEventData(uuid.v4(), 'some-type', true, null, getData())
	    			, client.createEventData(uuid.v4(), 'some-type', true, getData(), getData())
	    			]
	    	transaction.write(events, function(err) {
	    		if(err) return done(err)

	    		transaction.commit(function(err) {
		    		if(err) return done(err)
		    		var readOptions = {
		    			start: 0
		    		, count: 100
		    		}

		    		connection.readStreamEventsForward(stream, readOptions, function(err, readResult) {
		    			if(err) return done(err)

		    			readResult.Status.should.equal('Success')
		    			readResult.Events.length.should.equal(6)
		    			readResult.Events.forEach(function(evt) {
		    				evt.OriginalEvent.IsJson.should.be.true
		    			})
		    			done()
		    		})
	    		})
	    	})
    	})
    })
  })


  after(function(done) {
  	es.cleanup(done)
  })
})