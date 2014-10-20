//
//	RemoteFile - a single remote file, open for edit-streaming.
//

function RemoteFile( path ) {
	this.path = path;
	this.state = RemoteFile.State.closed;
	this.rfid = RemoteFile.nextRfid++;
}

RemoteFile.nextRfid = 1;	//	Remote File ID. Used to bind jobs for this file to one worker tunnel.
RemoteFile.State = {
	closed: 0,
	opening: 1,
	open: 2,
	error: 3,
};

RemoteFile.prototype.onStateChange = function( callback ) {
	this.stateChangeCb = callback;
}

RemoteFile.prototype.setState = function( newState ) {
	if ( newState == this.state )
		return;
	
	this.state = newState;
	
	if ( this.stateChangeCb )
		this.stateChangeCb( this );
}

RemoteFile.prototype.open = function() {
	this.setState( RemoteFile.State.opening );

	this.openJob = new JobHandle( {
		job: 'open',
		args: {
			path: this.path,
			rfid: this.rfid,
		},
		onSuccess: Tools.cb( this, this.openSuccess ),
		onFailure: Tools.cb( this, this.openFailure ),
	} );
}

RemoteFile.prototype.openSuccess = function( job, result ) {
	this.content = result.content;
	this.remoteChecksum = result.checksum;
	this.dos = result.dos;
	
	this.setState( RemoteFile.State.open );
}

RemoteFile.prototype.openFailure = function( job, code, message ) {
	console.log( "Failed to open file: " + code + " - " + message );

	this.errorMessage = message;
	this.setState( RemoteFile.State.error );
}

