module.exports = StreamMetadataResult;


function StreamMetadataResult(stream, isStreamDeleted, metastreamVersion, streamMetadata) {
    if (!(this instanceof StreamMetadataResult)) {
        return new StreamMetadataResult(stream, isStreamDeleted, metastreamVersion, streamMetadata)
    }

    this.Stream = stream;
    this.IsStreamDeleted = isStreamDeleted;
    this.MetastreamVersion = metastreamVersion;
    this.StreamMetadata = streamMetadata || new Buffer(0)
}