//
//	JobHandle - a client-side handle to a job running in the NodeJS backend.
//

var ipc = window.ipc || require( 'ipc' );

function JobHandle( args ) {
	var defaults = {};
	this.args = $.extend( defaults, args );

	//	Create the Job on the browser-side.
	this.status = ipc.sendSync( 'Job.create', { 
		job: this.args.job, 
		args: this.args.args,
	} );
	
	JobHandle.handles[ this.status.id ] = this;
	
	//	Guarantee that this will return by an instant fail or success state.
	setTimeout( Tools.cb( this, this.checkState ), 1 );
}

JobHandle.handles = {};

JobHandle.prototype.getArg = function( name ) {
	return this.args.args[ name ];
}

JobHandle.prototype.checkState = function() {
	//	Check if the job is done.
	switch ( this.status.state ) {
		case 'failed':
			this.failed();
			break;
		
		case 'done':
			this.done();
			break;
	}
}

JobHandle.prototype.failed = function() {
	if ( this.args.onFailure )
		this.args.onFailure( this, this.status.code, this.status.message );
	
	delete JobHandle.handles[ this.status.id ];
}

JobHandle.prototype.done = function() {
	if ( this.args.onSuccess )
		this.args.onSuccess( this, this.status.result );

	delete JobHandle.handles[ this.status.id ];
}

JobHandle.getById = function( jobId ) {
	return JobHandle.handles[ jobId ];
}

//
//	JobHandle IPC stuff; handles status updates and finish notifications from the server
//

//	Job.update - called when a job gets updated.
ipc.on( 'Job.update', function( status ) {
	var jobId = status.id;
	var job = JobHandle.getById( jobId );
	if ( job ) {
		job.status = status;
		job.checkState();
	}
} );
