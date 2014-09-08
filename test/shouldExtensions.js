var should = require('should')

should.use(function(should, Assertion) {
  Assertion.add('matchEvents', function(val, description) {
    var actual = getArray(this.obj).map(normalizeEvent)
    	, expected = getArray(val).map(normalizeEvent)

    this.params = { operator: 'to match events', expected: expected, showDiff: false, message: description }

    actual.should.eql(expected)
  })

  Assertion.alias('matchEvents', 'matchEvent')
})


function getArray(obj) {
	return Array.isArray(obj) ? obj : [ obj ]
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