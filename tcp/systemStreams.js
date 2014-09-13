var systemStreams = {}

Object.defineProperties(systemStreams, {
  allStream: { value: '$all' }
, streamsStream: { value: '$streams' }
, settingsStream: { value: '$settings' }
, statsStreamPrefix: { value: '$stats' }
, isMetastream: { value: function(metastreamId) {
		return metastreamId.indexOf('$$') === 0
	}}
, isSystemStream: { value: function(streamId) {
		return streamId.indexOf('$') === 0
	}}
, metastreamOf: { value: function(streamId) {
		return '$$' + streamId
	}}
, originalStreamOf: { value: function(metastreamId) {
		return metastreamId.slice(2)
	}}
})

module.exports = systemStreams
