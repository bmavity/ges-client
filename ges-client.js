var tcpConnect = require('./tcp/connection')
	, streamMetadata = require('./tcp/streamMetadata')
	, eventData = require('./eventData')
	, expectedVersion = {}
	, streamPosition = {}
	, systemEventTypes = {}
	, systemStreams = {}


module.exports = createConnection


Object.defineProperties(module.exports, {
	expectedVersion: { value: expectedVersion }
, maxRecordCount: { value: 2147483647 }
, streamPosition: { value: streamPosition }
, createEventData: { value: eventData }
})

Object.defineProperties(expectedVersion, {
	any: { value: -2 }
, noStream: { value: -1 }
, emptyStream: { value: -1 }
})

Object.defineProperties(streamPosition, {
	start: { value: 0 }
, end: { value: -1 }
})

Object.defineProperties(systemEventTypes, {
  streamDeleted: { value: '$streamDeleted' }
, statsCollection: { value: '$statsCollected' }
, linkTo: { value: '$>' }
, streamMetadata: { value: '$metadata' }
, settings: { value: '$settings' }
})

Object.defineProperties(systemStreams, {
  streamsStream: { value: '$streams' }
, settingsStream: { value: '$settings' }
, statsStreamPrefix: { value: '$stats' }
, metastreamOf: { value: function(streamId) {
		return '$$' + streamId
	}}
, isMetastream: { value: function(metastreamId) {
		return metastreamId.indexOf('$$') === 0
	}}
, originalStreamOf: { value: function(metastreamId) {
		return metastreamId.slice(2)
	}}
})


function createConnection(opts, cb) {
	return tcpConnect(opts, cb)
}

/*
    static class SystemMetadata
    {
        public const string MaxAge = "$maxAge";
        public const string MaxCount = "$maxCount";
        public const string TruncateBefore = "$tb";
        public const string CacheControl = "$cacheControl";
        
        public const string Acl = "$acl";
        public const string AclRead = "$r";
        public const string AclWrite = "$w";
        public const string AclDelete = "$d";
        public const string AclMetaRead = "$mr";
        public const string AclMetaWrite = "$mw";

        public const string UserStreamAcl = "$userStreamAcl";
        public const string SystemStreamAcl = "$systemStreamAcl";
    }

    internal static class SystemEventTypes
    {
    }
 */