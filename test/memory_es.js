var spawn = require('child_process').spawn
	, path = require('path')
	, cmdDir = path.resolve(__dirname, '../EventStore')
	, cmd = path.resolve(cmdDir, 'clusternode')
	, opts = {
			cwd: cmdDir
		, env: {
				'LD_LIBRARY_PATH': cmdDir + ':$LD_LIBRARY_PATH'
			, 'MONO_GC_DEBUG': 'clear-at-gc'
			}
		}

module.exports = function createMemoryEventStore() {
	var es = spawn(cmd, ['--mem-db'], opts)

/*
	es.stdout.on('data', function(data) {
		console.log(data.toString())
	})

	es.on('close', function(err, signal) {
		if(err) return console.log('ES process closed with error: ', err)
		console.log('ES process closed with sig: ' + signal)
	})

	es.on('error', function(err) {
		console.log('ES process had error: ', err)
	})
*/

	return es
}
