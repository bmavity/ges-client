var client = require('../')
	, uuid = require('node-uuid')
	, should = require('./shouldExtensions')


describe('when creating event data', function() {
	var eventData
		, eventId
		, data
		, metadata

	before(function() {
		eventId = uuid.v4()
		data = new Buffer('data')
		metadata = new Buffer('metadata')

		eventData = client.createEventData(eventId, 'test-type', false, data, metadata)
	})

  it('should have proper event id', function() {
  	eventData.EventId.should.equal(eventId)
  })

  it('should have proper event type', function() {
  	eventData.Type.should.equal('test-type')
  })

  it('should have proper isJson property', function() {
  	eventData.IsJson.should.be.false
  })

  it('should have proper data', function() {
  	eventData.Data.should.equal(data)
  })

  it('should have proper metadata', function() {
  	eventData.Metadata.should.equal(metadata)
  })
})

describe('when creating event data with undefined data and metadata', function() {
	var eventData
		, eventId

	before(function() {
		eventId = uuid.v4()

		eventData = client.createEventData(eventId, 'test-type')
	})

  it('should have empty buffer for data', function() {
  	eventData.Data.should.matchBuffer(new Buffer(0))
  })

  it('should have empty buffer for metadata', function() {
  	eventData.Metadata.should.matchBuffer(new Buffer(0))
  })
})

describe('when creating event data with non-json data and metadata', function() {
	var eventData
		, eventId

	before(function() {
		eventId = uuid.v4()

		eventData = client.createEventData(eventId, 'test-type', false, 'hi', 'bye')
	})

  it('should properly wrap data in a Buffer', function() {
  	eventData.Data.should.matchBuffer(new Buffer('hi'))
  })

  it('should properly wrap metadata in a Buffer', function() {
  	eventData.Metadata.should.matchBuffer(new Buffer('bye'))
  })
})

describe('when creating event data with json data and metadata and they are both objects', function() {
	var eventData
		, eventId
		, data
		, metadata

	before(function() {
		eventId = uuid.v4()

		data = {
			me: 'data'
		}

		metadata = {
			me: 'metadata'
		}

		eventData = client.createEventData(eventId, 'test-type', true, data, metadata)
	})

  it('should properly serialize and wrap data in a Buffer', function() {
  	var parsedData = JSON.parse(eventData.Data.toString())
  	parsedData.should.eql(data)
  })

  it('should properly serialize and wrap metadata in a Buffer', function() {
  	var parsedMetadata = JSON.parse(eventData.Metadata.toString())
  	parsedMetadata.should.eql(metadata)
  })
})
