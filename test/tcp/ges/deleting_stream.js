var client = require('../../../')
	, ges = require('ges-test-helper').memory
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')

describe('deleting_stream', function() {
	var es
		, connectionSettings

	before(function(done) {
		es = ges(function(err, settings) {
			connectionSettings = settings
			done(err)
		})
	})

	function getConnection(cb) {
		client(connectionSettings, function(err, con) {
			if(err) return cb(err)
			es.addConnection(con)
			cb(null, con)
		})
	}

  it('which_doesnt_exists_should_success_when_passed_empty_stream_expected_version', function(done) {
    var stream = 'which_already_exists_should_success_when_passed_empty_stream_expected_version'
    getConnection(function(err, connection) {
    	if(err) return done(err)
    	var deleteData = {
    				expectedVersion: client.expectedVersion.emptyStream
    			, hardDelete: true
		    	}
    	connection.deleteStream(stream, deleteData, function(err) {
    		(err === null).should.be.true

    		connection.close()
    		done()
    	})
    })
  })

  it('which_doesnt_exists_should_success_when_passed_any_for_expected_version', function(done) {
    var stream = 'which_already_exists_should_success_when_passed_any_for_expected_version'
    getConnection(function(err, connection) {
    	if(err) return done(err)
    	var deleteData = {
    				expectedVersion: client.expectedVersion.any
    			, hardDelete: true
		    	}
    	connection.deleteStream(stream, deleteData, function(err) {
    		(err === null).should.be.true

    		connection.close()
    		done()
    	})
    })
  })

  it('with_invalid_expected_version_should_fail', function(done) {
    var stream = 'with_invalid_expected_version_should_fail'
    getConnection(function(err, connection) {
    	if(err) return done(err)
    	var deleteData = {
    				expectedVersion: 1
    			, hardDelete: true
		    	}
    	connection.deleteStream(stream, deleteData, function(err) {
    		(err === null).should.be.false
    		
    		connection.close()
    		done()
    	})
    })
  })

  it('should_return_log_position_when_writing', function(done) {
    var stream = 'delete_should_return_log_position_when_writing'
    getConnection(function(err, connection) {
    	if(err) return done(err)
    	var deleteData = {
    				expectedVersion: client.expectedVersion.emptyStream
    			, hardDelete: true
		    	}
    	connection.deleteStream(stream, deleteData, function(err, result) {

    		result.LogPosition.PreparePosition.should.be.greaterThan(0)
    		result.LogPosition.CommitPosition.should.be.greaterThan(0)

    		connection.close()
    		done()
    	})
    })
  })

  it('which_was_already_deleted_should_fail', function(done) {
    var stream = 'which_was_allready_deleted_should_fail'
    getConnection(function(err, connection) {
    	if(err) return done(err)
    	var deleteData1 = {
    				expectedVersion: client.expectedVersion.emptyStream
    			, hardDelete: true
		    	}
    	connection.deleteStream(stream, deleteData1, function(err, result) {
    		if(err) return done(err)
	    	var deleteData2 = {
	    				expectedVersion: client.expectedVersion.any
	    			, hardDelete: true
			    	}
	    	connection.deleteStream(stream, deleteData2, function(err, result) {
	    		should.not.be.null(err)

	    		done()
	    	})
    	})
    })
  })

  after(function(done) {
  	es.cleanup(done)
  })
})