var should = require('should')
	, dummy = {}

module.exports = should

should.use(function(should, Assertion) {
  Assertion.add('matchBuffer', function(val, description) {
    var actual = new Buffer(this.obj.length)
    	, expected = new Buffer(val)

    this.obj.copy(actual)
    val.copy(expected)

    this.params = { operator: 'to match buffer', expected: expected, showDiff: false, message: description }

    actual.should.eql(expected)
  })

  Assertion.add('matchEvents', function(val, description) {
    var actual = getArray(this.obj).map(normalizeEvent)
    	, expected = getArray(val).map(normalizeEvent)

    this.params = { operator: 'to match events', expected: expected, showDiff: false, message: description }

    actual.should.eql(expected)
  })

  Assertion.add('matchEventIdsWith', function(val, description) {
    var actual = getArray(this.obj).map(getEventId)
    	, expected = getArray(val).map(getEventId)

    this.params = { operator: 'to match event ids with', expected: expected, showDiff: false, message: description }

    actual.should.eql(expected)
  })

  Assertion.add('matchEventNumbersWith', function(val, description) {
    var actual = getArray(this.obj).map(getEventNumber)
    	, expected = getArray(val).map(getEventNumber)

    this.params = { operator: 'to match event numbers with', expected: expected, showDiff: false, message: description }

    actual.should.eql(expected)
  })

  Assertion.alias('matchEvents', 'matchEvent')
})

should.fail = function() {
	dummy.should.eql(null, 'Should Fail.')
}

should.pass = function() {
	dummy.should.eql({}, 'Should Pass.')
}

should.be = {
	null: function(actual) {
		(actual === null).should.be.true
	}
}

should.not = {
	be: {
		null: function(actual) {
			(actual === null).should.be.false
		}
	}
}


function getArray(obj) {
	return Array.isArray(obj) ? obj : [ obj ]
}

function getEventId(evt) {
	return evt.EventId || evt.OriginalEvent.EventId
}

function getEventNumber(evt) {
	return evt.OriginalEvent.EventNumber
}

function normalizeEvent(evt) {
	var record = evt.Event
	if(record) {
		var data = new Buffer(record.Data.length)
			, metadata = new Buffer(record.Metadata.length)
		record.Data.copy(data)
		record.Metadata.copy(metadata)
		return {
			EventId: record.EventId
		, Type: record.EventType
		, IsJson: record.IsJson
		,	Data: data
		, Metadata: metadata
		}
	}
	return evt
}