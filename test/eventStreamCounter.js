var sliceSize = 10

module.exports = function eventStreamCounter(store, stream, cb) {
  var result = 0

  function readUntilEnd() {
  	var opts = { start: result, count: sliceSize }
	  store.readStreamEventsForward(stream, opts, function(err, readResult) {
	  	if(err) return cb(err)
	  		
		  result += readResult.Events.length
		  if(readResult.IsEndOfStream) {
			  cb(null, result)
		  } else {
		  	readUntilEnd()
		  }
	  })
  }
  readUntilEnd()
}
