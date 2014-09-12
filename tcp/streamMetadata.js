module.exports = StreamMetadata


function StreamMetadata(options) {
	options = options || {}
	if(!(this instanceof StreamMetadata)) {
		return new StreamMetadata(options)
	}

	//maxCount, maxAge, truncateBefore, cacheControl, acl
}