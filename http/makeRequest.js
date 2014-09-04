var request = require('request')
	, is = require('is')
	, esMediaType = 'application/vnd.eventstore.atom+json'
	, server = 'http://127.0.0.1:2113/streams/'
	, username = 'admin'
	, password = 'changeit'

module.exports = makeAuthorizedRequest

function makeAuthorizedRequest(optsOrStream, cb) {
	var opts = is.string(optsOrStream) ? { stream: optsOrStream } : optsOrStream
		, uri = opts.stream.indexOf('http') === 0 ? opts.stream : server + opts.stream
		, options = {
				url: uri
			, auth: {
					username: username
				, password: password
				}
			, headers: {
					'Accept': esMediaType
				, 'Content-Type': 'application/vnd.eventstore.atom+json'
				//, 'ES-LongPoll': 10
				}
			}

	options.method = opts.method
	if(opts.body) {
		options.body = JSON.stringify(opts.body)
	}

	request(options, cb)
}

