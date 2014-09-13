var systemMetadata = require('./systemMetadata')
	, nonCustomProperties = [
			systemMetadata.maxCount
		, systemMetadata.maxAge
		, systemMetadata.truncateBefore
		, systemMetadata.cacheControl
		, systemMetadata.acl
		]

module.exports = StreamMetadata


function StreamMetadata(obj) {
	obj = obj || {}
	if(!(this instanceof StreamMetadata)) {
		return new StreamMetadata(obj)
	}

	if(Buffer.isBuffer(obj)) {
		this._fromJSON(obj.toString())
	} else {
		this._fromObj(obj)
	}
}

StreamMetadata.prototype.toJSON = function() {
	var metadata = {}
	if(this.MaxCount) metadata[systemMetadata.maxCount] = this.MaxCount
	if(this.MaxAge) metadata[systemMetadata.maxAge] = this.MaxAge
	if(this.TruncateBefore) metadata[systemMetadata.truncateBefore] = this.TruncateBefore
	if(this.CacheControl) metadata[systemMetadata.cacheControl] = this.CacheControl
	if(this.Acl) {
		var acl = {}
		metadata[systemMetadata.acl] = acl
		if(this.Acl.ReadRole) acl[systemMetadata.aclRead] = this.Acl.ReadRole
		if(this.Acl.WriteRole) acl[systemMetadata.aclWrite] = this.Acl.WriteRole
		if(this.Acl.DeleteRole) acl[systemMetadata.aclDelete] = this.Acl.DeleteRole
		if(this.Acl.MetaReadRole) acl[systemMetadata.aclMetaRead] = this.Acl.MetaReadRole
		if(this.Acl.MetaWriteRole) acl[systemMetadata.aclMetaWrite] = this.Acl.MetaWriteRole
	}

	var me = this
	Object.keys(this).forEach(function(key) {
		if(isCustomProperty(key)) {
			metadata[key] = me[key]
		}
	})
	
	return JSON.stringify(metadata)
}

StreamMetadata.prototype._fromJSON = function(json) {
	var metadata = JSON.parse(json)
		, obj = {}
		, acl = metadata[systemMetadata.acl]
	obj.maxCount = metadata[systemMetadata.maxCount]
	obj.maxAge = metadata[systemMetadata.maxAge]
	obj.truncateBefore = metadata[systemMetadata.truncateBefore]
	obj.cacheControl = metadata[systemMetadata.cacheControl]
	obj.acl = !acl ? null : {
		readRole: acl[systemMetadata.aclRead]
	, writeRole: acl[systemMetadata.aclWrite]
  , deleteRole: acl[systemMetadata.aclDelete]
	, metaReadRole: acl[systemMetadata.aclMetaRead]
 	, metaWriteRole: acl[systemMetadata.aclMetaWrite]
	}

	var me = this
	Object.keys(metadata).forEach(function(key) {
		if(isCustomProperty(key)) {
			me[key] = metadata[key]
		}
	})
	this._fromObj(obj)
}

StreamMetadata.prototype._fromObj = function(obj) {
	this.MaxCount = !!obj.maxCount || obj.maxCount === 0 ? obj.maxCount : null
	this.MaxAge = !!obj.maxAge ? obj.maxAge : null
	this.TruncateBefore = !!obj.truncateBefore || obj.truncateBefore === 0 ? obj.truncateBefore : null
	this.CacheControl = !!obj.cacheControl ? obj.cacheControl : null
	this.Acl = !obj.acl ? null : {
		ReadRole: !!obj.acl.readRole ? obj.acl.readRole : null
	, WriteRole: !!obj.acl.writeRole ? obj.acl.writeRole : null
  , DeleteRole: !!obj.acl.deleteRole ? obj.acl.deleteRole : null
	, MetaReadRole: !!obj.acl.metaReadRole ? obj.acl.metaReadRole : null
 	, MetaWriteRole: !!obj.acl.metaWriteRole ? obj.acl.metaWriteRole : null
	}

	var me = this
		, nonCustomNames = ['maxCount', 'maxAge', 'truncateBefore', 'cacheControl', 'acl']
	Object.keys(obj).forEach(function(key) {
		if(nonCustomNames.indexOf(key)) {
			me[key] = obj[key]
		}
	})
}

function isCustomProperty(name) {
	return nonCustomProperties.indexOf(name) === -1
}
