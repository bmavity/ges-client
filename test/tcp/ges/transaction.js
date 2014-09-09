var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

describe('appending_to_implicitly_created_stream', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5678 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5678 })

			connection.on('connect', function() {
				done()
			})

			connection.on('error', done)
		})
	})

  it('should_start_on_non_existing_stream_with_correct_exp_ver_and_create_stream_on_commit')
    //var stream = 'should_start_on_non_existing_stream_with_correct_exp_ver_and_create_stream_on_commit'
  it('should_start_on_non_existing_stream_with_exp_ver_any_and_create_stream_on_commit')
    //var stream = 'should_start_on_non_existing_stream_with_exp_ver_any_and_create_stream_on_commit'
  it('should_fail_to_commit_non_existing_stream_with_wrong_exp_ver')
    //var stream = 'should_fail_to_commit_non_existing_stream_with_wrong_exp_ver'
  it('should_do_nothing_if_commits_no_events_to_empty_stream')
    //var stream = 'should_do_nothing_if_commits_no_events_to_empty_stream'
  it('should_do_nothing_if_transactionally_writing_no_events_to_empty_stream')
    //var stream = 'should_do_nothing_if_transactionally_writing_no_events_to_empty_stream'
  it('should_validate_expectations_on_commit')
    //var stream = 'should_validate_expectations_on_commit'
  it('should_commit_when_writing_with_exp_ver_any_even_while_somene_is_writing_in_parallel')
    //var stream = 'should_commit_when_writing_with_exp_ver_any_even_while_somene_is_writing_in_parallel'
  it('should_fail_to_commit_if_started_with_correct_ver_but_committing_with_bad')
    //var stream = 'should_fail_to_commit_if_started_with_correct_ver_but_committing_with_bad'
  it('should_not_fail_to_commit_if_started_with_wrong_ver_but_committing_with_correct_ver')
    //var stream = 'should_not_fail_to_commit_if_started_with_wrong_ver_but_committing_with_correct_ver'
  it('should_fail_to_commit_if_started_with_correct_ver_but_on_commit_stream_was_deleted')
    //var stream = 'should_fail_to_commit_if_started_with_correct_ver_but_on_commit_stream_was_deleted'
  it('idempotency_is_correct_for_explicit_transactions_with_expected_version_any')
    //var streamId = 'idempotency_is_correct_for_explicit_transactions_with_expected_version_any'

  after(function(done) {
  	es.on('exit', function(code, signal) {
	  	done()
  	})
  	es.on('error', done)
  	es.kill()
  })
})
