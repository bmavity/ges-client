module.exports = RawStreamMetadataResult


function RawStreamMetadataResult(stream, isStreamDeleted, metastreamVersion, streamMetadata) {
	if(!(this instanceof RawStreamMetadataResult)) {
		return new RawStreamMetadataResult(stream, isStreamDeleted, metastreamVersion, streamMetadata)
	}

	this.Stream = stream
  this.IsStreamDeleted = isStreamDeleted
  this.MetastreamVersion = metastreamVersion
  this.StreamMetadata = streamMetadata || new Buffer(0)
}