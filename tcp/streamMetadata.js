module.exports = StreamMetadata


function StreamMetadata(options) {
	if(Buffer.isBuffer(options)) {
		options = JSON.parse(options.toString())
	}
	options = options || {}
	if(!(this instanceof StreamMetadata)) {
		return new StreamMetadata(options)
	}

	if(options.maxCount) this.MaxCount = options.maxCount
	if(options.MaxCount) this.MaxCount = options.MaxCount

  if(options.maxAge) this.MaxAge = options.maxAge
  if(options.MaxAge) this.MaxAge = options.MaxAge

  if(options.truncateBefore) this.TruncateBefore = options.truncateBefore
  if(options.TruncateBefore) this.TruncateBefore = options.TruncateBefore

  if(options.cacheControl) this.CacheControl = options.cacheControl
  if(options.CacheControl) this.CacheControl = options.CacheControl
  	
  if(options.acl) this.Acl = options.acl
  if(options.Acl) this.Acl = options.Acl

  if(options.customMetadata) this._customMetadata = options.customMetadata || {}
  if(options.CustomMetadata) this._customMetadata = options.CustomMetadata || {}
}