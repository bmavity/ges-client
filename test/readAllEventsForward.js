return
var ges = require('../')
	, util = require('util')
	, Writable = require('stream').Writable

function Logger() {
	Writable.call(this, {
		objectMode: true
	})
}
util.inherits(Logger, Writable)

Logger.prototype._write = function(evt, encoding, cb) {
	console.log(encoding, evt)
	cb(null)
}

ges(function(err, con) {
	var es = con.readAllEventsForward().pipe(new Logger())
	return
	console.log('after creation')
	es.on('readable', function() {
		console.log('is readable')
	  var chunk
	  while (null !== (chunk = es.read())) {
	    console.log('got event', chunk)
	  }
	})

	es.on('end', function() {
		console.log('ended')
	})
})