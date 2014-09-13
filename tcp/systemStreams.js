var systemStreams = {}

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

module.exports = systemStreams
