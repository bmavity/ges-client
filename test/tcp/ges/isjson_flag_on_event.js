var client = require('../../../')
	, ges = require('ges-test-helper')
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
		ges({ tcpPort: 5013 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5013 }, done)
		})
	})

  it('should_be_preserved_with_all_possible_write_and_read_methods', function(done) {
    var stream = 'should_be_preserved_with_all_possible_write_methods'
    	, appendOptions = {
    			expectedVersion: client.expectedVersion.any
    		, events: [
    				client.createEventData(uuid.v4(), 'some-type', true, { some: 'json' }, null)
    			, client.createEventData(uuid.v4(), 'some-type', true, null, { some: 'json' })
    			, client.createEventData(uuid.v4(), 'some-type', true, { some: 'json' }, { some: 'json' })
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
	    				client.createEventData(uuid.v4(), 'some-type', true, { some: 'json' }, null)
	    			, client.createEventData(uuid.v4(), 'some-type', true, null, { some: 'json' })
	    			, client.createEventData(uuid.v4(), 'some-type', true, { some: 'json' }, { some: 'json' })
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
  	connection.close(function() {
	  	es.on('exit', function(code, signal) {
		  	done()
	  	})
	  	es.on('error', done)
	  	es.kill()
  	})
  })
})