//
//	Job - a potentially long-running request (eg: "get file contents", "read directory")
//

var ipc = require( 'ipc' );
var Connection = require('ssh2');

var jobs = {};
var nextJobId = 0;

function Job( job, args, sender ) {
	this.job = job;
	this.args = args;
	this.sender = sender;
	this.id = nextJobId++;
	
	this.status = {
		id: this.id,
		state: 'running',
	}

	jobs[ this.id ] = this;
	
	this.start();
}

Job.getById = function( jobId ) {
	return jobs[ jobId ];
}

Job.prototype.start = function() {
	if ( jobTypes[ this.job ] )
		jobTypes[ this.job ]( this );
	else
		this.fail( 'system', 'Unknown job type: ' + this.job );
}

Job.prototype.set = function( code, message ) {
	this.status.code = code;
	this.status.message = message;
	
	this.pingStatus();
}

Job.prototype.fail = function( code, message ) {
	this.status.state = 'failed';
	this.status.code = code;
	this.status.message = message;
	
	this.pingStatus();
	this.destroy();
}

Job.prototype.done = function( result ) {
	this.status.state = 'done';
	this.status.result = result;
	
	this.pingStatus();
	this.destroy();
}

Job.prototype.destroy = function() {
	delete jobs[ this.id ];
}

Job.prototype.pingStatus = function() {
	if ( this.sender ) {
		this.sender.send( 'Job.update', this.status );
	}
}

Job.prototype.getPathType = function() {
	return Tools.getPathType( this.args.path );
}

//	Export Job class.
module.exports = Job;

//
//	Available job types
//

var jobTypes = {

	//	Dummy test job; just connects to a server and tries the connection.
	test_connection: function( job ) {
		var conn = new Connection();
		var result = '';
		
		conn.on('ready', function() {
  			console.log('Connection :: ready');
			conn.exec('date', function(err, stream) {
	   			if (err) throw err;
    			stream.on('exit', function(code, signal) {
					console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
					job.done( result );
				}).on('close', function() {
					console.log('Stream :: close');
					conn.end();
				}).on('data', function(data) {
					console.log('STDOUT: ' + data);
					result += data;
				}).on('error', function(err) {
					job.fail( 'connection-error', err );
				}).stderr.on('data', function(data) {
					console.log('STDERR: ' + data);
				});
	  		});
		});

		conn.connect({
	  		host: 'put a host here.',
  			port: 22,
	  		username: 'put a username here',
	  		agent: process.env.SSH_AUTH_SOCK,
		});
	},
	
};

//
//	Job IPC calls
//

//	Job.create - create a new job, return a status object.
ipc.on( 'Job.create', function( event, args ) {
	var job = new Job( args.job, args.args, event.sender );
	event.returnValue = job.status;
} );

//	Job.getStatus - get the current status of a job.
ipc.on( 'Job.getStatus', function( event, jobId ) {
	var job = Job.getById( jobId );
	if ( ! job )
		event.returnValue = null;
	else
		event.returnValue = job.status;
} );
