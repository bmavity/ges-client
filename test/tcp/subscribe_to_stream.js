var client = require('../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../createTestEvent')
	, range = require('../range')
	, streamWriter = require('../streamWriter')
	, eventStreamCounter = require('../eventStreamCounter')
	, should = require('../shouldExtensions')


describe('subscribe to stream', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5050 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5050 }, done)
		})
	})

  it('when confirmed, should have position and event number', function(done) {
    var stream = 'when confirmed, should have position and event number'
    	, subscription = connection.subscribeToStream(stream)

    subscription.on('confirmed', function(subscriptionData) {
    	subscriptionData.lastCommitPosition.should.be.greaterThan(0)
    	subscriptionData.lastEventNumber.should.equal(-1)
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
