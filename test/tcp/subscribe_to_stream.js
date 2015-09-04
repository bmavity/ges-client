var client = require('../../')
	, ges = require('ges-test-helper').memory
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
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
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
  	es.cleanup(done)
  })
})
