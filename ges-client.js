var tcpConnect = require('./tcp/connection')
	, expectedVersion = {}
	, streamPosition = {}


module.exports = createConnection


Object.defineProperties(module.exports, {
	expectedVersion: { value: expectedVersion }
, maxRecordCount: { value: 2147483647 }
, createEventData: { value: require('./eventData') }
, createStreamMetadata: { value: require('./tcp/streamMetadata') }
, position: { value: require('./tcp/position') }
, streamPosition: { value: streamPosition }
, systemEventTypes: { value: require('./tcp/systemEventTypes') }
, systemRoles: { value: require('./tcp/systemRoles') }
, systemStreams: { value: require('./tcp/systemStreams') }
, systemUsers: { value: require('./tcp/systemUsers') }
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