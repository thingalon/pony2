//
//	BrowserJobRequest - represents a job request sent to a Worker script from the Browser layer.
//

var Binary = require( './binary.js' );
var Tools = require( '../common/tools.js' );
var Type = require( '../common/type.js' );
var Host = require( './host.js' );
var ipc = require( 'ipc' );

var nextRequestId = 1;
var activeJobs = {};

function BrowserJobRequest( details ) {
    this.id = nextRequestId++;
    activeJobs[ this.id ] = this;
    
    this.job = details.job;
    this.args = details.args;
    this.sender = details.sender;
    this.state = 'active';
    
    //  Ensure job updates happen *after* construction finishes.
    setTimeout( this._sendToHost.bind( this ), 1 );
}

//  destroy: removes this job from the active list, allowing it to get GC'd.
BrowserJobRequest.prototype.destroy = function() {
	delete activeJobs[ this.id ];
}

//  _sendToHost; sends this job to the appropriate host.
BrowserJobRequest.prototype._sendToHost = function() {
    var host = null;
    
    //  Has a host been explicitly provided?
    if ( this.args.username && this.args.hostname )
        host = Host.find( this.args.username, this.args.hostname, true );
    
    //  Has a path been given?
    if ( ! host && this.args.path ) {
        var splitPath = Tools.splitPath( this.args.path );
        host = Host.find( splitPath.user, splitPath.host, true );
        this.args.path = splitPath.path;
    }
    
    //  If no host found, fail. :(
    if ( ! host ) {
        this.fail( 'NO_HOST', 'No host found to handle "' + this.job + '" job.' );
        return;
    }
    
    //  Send this to the host.
    host.handleJob( this );
};

BrowserJobRequest.prototype.done = function( result ) {
    this.state = 'succeeded';
    this.result = result;
	
	this.pingStatus();
	this.destroy();
};

//  fail this job. Sad trombone WOMP WOMP
BrowserJobRequest.prototype.fail = function( code, message ) {
    this.state = 'failed';
    this.errorCode = code;
    this.errorMessage = message;
    
    this.pingStatus();
	this.destroy();
};

//  Send a notice to the client layer that this job has changed state.
BrowserJobRequest.prototype.pingStatus = function() {
    if ( this.sender ) {
		this.sender.send( 'BrowserJobRequest.update', {
            id: this.id,
            state: this.state,
            errorCode: this.errorCode,
            errorMessage: this.errorMessage,
            result: this.result,
        } );
    }
};

//  Encode a job request for transport.
BrowserJobRequest.prototype.encode = function() {
	return Binary.encode( {
		i: this.id,
		j: this.job,
		a: this.args,
	} );
}


//	Got a message from the remote server; handle it.
BrowserJobRequest.prototype.handleMessage = function( message ) {
	//	For now, all messages close jobs. TODO: Make it possible for update messages / partial downloads.
	if ( message.hasOwnProperty( 'errcode' ) && message.hasOwnProperty( 'errmessage' ) )
		this.fail( message.errcode, message.errmessage );
	else
		this.done( message );
}

//
//	BrowserJobRequest IPC stuff; handles create requests from the client layer.
//

ipc.on( 'BrowserJobRequest.create', function( event, details ) {
	var job = new BrowserJobRequest( {
        job: details.job,
        args: details.args,
        sender: event.sender
    } );
    
    event.returnValue = job.id;
} );



/*var Binary = require( './binary.js' );
var Tools = require( '../common/tools.js' );
var Type = require( '../common/type.js' );
var Host = require( './host.js' );
var ipc = require( 'ipc' );

var jobs = {};
var nextJobId = 0;

function BrowserJobRequest( job, args, sender ) {
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

BrowserJobRequest.prototype.encode = function() {
	return Binary.encode( {
		i: this.id,
		j: this.job,
		a: this.args,
	} );
}

BrowserJobRequest.getById = function( jobId ) {
	return jobs[ jobId ];
}

BrowserJobRequest.prototype.start = function() {
	if ( jobTypes[ this.job ] )
		jobTypes[ this.job ]( this, this.args );
	else
		this.fail( 'system', 'Unknown job type: ' + this.job );
}

BrowserJobRequest.prototype.set = function( code, message ) {
	this.status.code = code;
	this.status.message = message;
	
	this.pingStatus();
}

BrowserJobRequest.prototype.fail = function( code, message ) {
	this.status.state = 'failed';
	this.status.code = code;
	this.status.message = message;
	
	this.pingStatus();
	this.destroy();
}

BrowserJobRequest.prototype.done = function( result ) {
	this.status.state = 'done';
	this.status.result = result;
	
	this.pingStatus();
	this.destroy();
}

BrowserJobRequest.prototype.destroy = function() {
	delete jobs[ this.id ];
}

BrowserJobRequest.prototype.pingStatus = function() {
	if ( this.sender ) {
		this.sender.send( 'Job.update', this.status );
	}
}

BrowserJobRequest.prototype.getPathType = function() {
	return Tools.getPathType( this.args.path );
}

//	Send this job off to be processed by the specified host, opening a new conneciton if necessary
BrowserJobRequest.prototype.sendToHost = function( user, hostname ) {
	var host = Host.find( user, hostname, true );
	this.host = host;
	host.handleJob( this );
}

//	Checks for a 'path' parameter in the job, if present and looks remote, it sends the job on to the remote host.
BrowserJobRequest.prototype.maybeSendToHost = function() {
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
module.exports = BrowserJobRequest;

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
	var job = new BrowserJobRequest( args.job, args.args, event.sender );
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
*/