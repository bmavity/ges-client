var systemMetadata = require('./systemMetadata')
	, nonCustomNames = [
			'maxCount', 'maxAge', 'truncateBefore', 'cacheControl', 'acl'
		, 'MaxCount', 'MaxAge', 'TruncateBefore', 'CacheControl', 'Acl'
		, systemMetadata.maxCount
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
		if(obj.length === 0) {
			this._fromObj({})
		} else {
			this._fromJSON(obj.toString())
		}
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
			, rr = this.Acl.ReadRoles
			, wr = this.Acl.WriteRoles
			, dr = this.Acl.DeleteRoles
			, mrr = this.Acl.MetaReadRoles
			, mwr = this.Acl.MetaWriteRoles
		metadata[systemMetadata.acl] = acl
		if(rr) acl[systemMetadata.aclRead] = Array.isArray(rr) ? rr : [ rr ]
		if(wr) acl[systemMetadata.aclWrite] = Array.isArray(wr) ? wr : [ wr ]
		if(dr) acl[systemMetadata.aclDelete] = Array.isArray(dr) ? dr : [ dr ]
		if(mrr) acl[systemMetadata.aclMetaRead] = Array.isArray(mrr) ? mrr : [ mrr ]
		if(mwr) acl[systemMetadata.aclMetaWrite] = Array.isArray(mwr) ? mwr : [ mwr ]
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
		readRoles: acl[systemMetadata.aclRead]
	, writeRoles: acl[systemMetadata.aclWrite]
  , deleteRoles: acl[systemMetadata.aclDelete]
	, metaReadRoles: acl[systemMetadata.aclMetaRead]
 	, metaWriteRoles: acl[systemMetadata.aclMetaWrite]
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
	this.Acl = null

	if(obj.acl) {
		var rr = obj.acl.readRoles
			, wr = obj.acl.writeRoles
			, dr = obj.acl.deleteRoles
			, mrr = obj.acl.metaReadRoles
			, mwr = obj.acl.metaWriteRoles

		this.Acl = {
			ReadRoles: !rr ? null : Array.isArray(rr) ? rr : [ rr ]
		, WriteRoles: !wr ? null : Array.isArray(wr) ? wr : [ wr ]
	  , DeleteRoles: !dr ? null : Array.isArray(dr) ? dr : [ dr ]
		, MetaReadRoles: !mrr ? null : Array.isArray(mrr) ? mrr : [ mrr ]
	 	, MetaWriteRoles: !mwr ? null : Array.isArray(mwr) ? mwr : [ mwr ]
		}

		this.Acl.ReadRole = !this.Acl.ReadRoles ? null : this.Acl.ReadRoles[0]
		this.Acl.WriteRole = !this.Acl.WriteRoles ? null : this.Acl.WriteRoles[0]
		this.Acl.DeleteRole = !this.Acl.DeleteRoles ? null : this.Acl.DeleteRoles[0]
		this.Acl.MetaReadRole = !this.Acl.MetaReadRoles ? null : this.Acl.MetaReadRoles[0]
		this.Acl.MetaWriteRole = !this.Acl.MetaWriteRoles ? null : this.Acl.MetaWriteRoles[0]
	}

	var me = this
	Object.keys(obj).forEach(function(key) {
		if(isCustomProperty(key)) {
			me[key] = obj[key]
		}
	})
}

function isCustomProperty(name) {
	return nonCustomNames.indexOf(name) === -1
}
