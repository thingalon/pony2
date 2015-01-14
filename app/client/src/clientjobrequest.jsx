//
//	ClientJobRequest - Represents a single job request sent to a worker script from the client layer.
//

var ipc = window.ipc || require( 'ipc' );

function ClientJobRequest( args ) {
	this.args = args;

	//	Create the Job on the browser-side.
	this.status = ipc.sendSync( 'Job.create', { 
		job: this.args.job, 
		args: this.args.args,
	} );
	
	ClientJobRequest.handles[ this.status.id ] = this;
	
	//	Guarantee that this will return by an instant fail or success state.
	setTimeout( Tools.cb( this, this.checkState ), 1 );
}

ClientJobRequest.handles = {};

ClientJobRequest.prototype.getArg = function( name ) {
	return this.args.args[ name ];
}

ClientJobRequest.prototype.checkState = function() {
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

ClientJobRequest.prototype.failed = function() {
	if ( this.args.onFailure )
		this.args.onFailure( this, this.status.code, this.status.message );
	
	delete ClientJobRequest.handles[ this.status.id ];
}

ClientJobRequest.prototype.done = function() {
	if ( this.args.onSuccess )
		this.args.onSuccess( this, this.status.result );

	delete ClientJobRequest.handles[ this.status.id ];
}

ClientJobRequest.getById = function( jobId ) {
	return ClientJobRequest.handles[ jobId ];
}

//
//	ClientJobRequest IPC stuff; handles status updates and finish notifications from the server
//

//	Job.update - called when a job gets updated.
ipc.on( 'Job.update', function( status ) {
	var jobId = status.id;
	var job = ClientJobRequest.getById( jobId );
	if ( job ) {
		job.status = status;
		job.checkState();
	}
} );
