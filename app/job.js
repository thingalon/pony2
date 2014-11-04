//
//	Job - a potentially long-running request (eg: "get file contents", "read directory")
//

var Binary = require( './binary.js' );
var Tools = require( './common/tools.js' );
var Type = require( './common/type.js' );
var Host = require( './host.js' );


var ipc = require( 'ipc' );

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

Job.prototype.encode = function() {
	return Binary.encode( {
		id: this.id,
		job: this.job,
		args: this.args,
	} );
}

Job.getById = function( jobId ) {
	return jobs[ jobId ];
}

Job.prototype.start = function() {
	if ( jobTypes[ this.job ] )
		jobTypes[ this.job ]( this, this.args );
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

//	Send this job off to be processed by the specified host, opening a new conneciton if necessary
Job.prototype.sendToHost = function( user, hostname ) {
	var host = Host.find( user, hostname, true );
	this.host = host;
	host.handleJob( this );
}

//	Checks for a 'path' parameter in the job, if present and looks remote, it sends the job on to the remote host.
Job.prototype.maybeSendToHost = function() {
	//	Find the right host by rfid.
	if ( this.args.rfid ) {
		var host = Host.findByRfid( this.args.rfid );
		if ( host ) {
			this.host = host;
			host.handleJob( this );
			return true;
		}
	}

	//	Find the right host by path
	if ( this.args.path ) {
		var splitPath = Tools.splitPath( this.args.path );
		if ( splitPath.type != Type.path.local ) {
			this.args.path = splitPath.path;
			this.sendToHost( splitPath.user, splitPath.host );
			return true;
		}		
	}
	
	return false;
}

//	Export Job class.
module.exports = Job;

//
//	Available job types
//

var jobTypes = {
	
	ls: function( job, args ) {
		var splitPath = Tools.splitPath( args.path );
		if ( splitPath.type == Type.path.local )
			return job.fail( 'not-implemented', "This wouldn't be a real PonyEdit if local paths worked before remote ones." );
		
		args.path = splitPath.path;
		job.sendToHost( splitPath.user, splitPath.host );
	},
	
	open: function( job, args ) {
		if ( ! job.maybeSendToHost() )
			return job.fail( 'not-implemented', 'Local ' + job.job + ' not yet implemented.' );
	},
	
	update: function( job, args ) {
		if ( ! job.maybeSendToHost() )
			return job.fail( 'not-implemented', 'Local ' + job.job + ' not implemented.' );
	},
	
	save: function( job, args ) {
		if ( ! job.maybeSendToHost() )
			return job.fail( 'not-implemented', 'Local ' + job.job + ' not yet implemeneted.' );
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
