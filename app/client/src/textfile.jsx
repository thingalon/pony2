//
//	TextFile - A utf-8 text file, open for edit-streaming.
//

function TextFile( path ) {
	this.path = path;
	this.state = TextFile.State.closed;
	this.rfid = TextFile.nextRfid++;
}

TextFile.nextRfid = 1;	//	Remote File ID. Used to bind jobs for this file to one worker tunnel.
TextFile.State = {
	closed: 0,
	opening: 1,
	open: 2,
	error: 3,
};

TextFile.prototype.onStateChange = function( callback ) {
	this.stateChangeCb = callback;
};

TextFile.prototype.setState = function( newState ) {
	if ( newState == this.state )
		return;
	
	this.state = newState;
	
	if ( this.stateChangeCb )
		this.stateChangeCb( this );
};

TextFile.prototype.open = function() {
	this.setState( TextFile.State.opening );

    this.openJob = new ClientJobRequest( { 
        job: 'open',
        args: {
            path: this.path,
            rfid: this.rfid,
        },
        onSuccess: this.openSuccess.bind( this ),
        onFailure: this.openFailure.bind( this ),
    } );
};

TextFile.prototype.openSuccess = function( job, result ) {
	this.content = result.r.content;
	this.remoteChecksum = result.r.checksum;
	this.dos = result.r.dos;
    
    console.log( result.content );
	
	this.setState( TextFile.State.open );
};

TextFile.prototype.openFailure = function( job, code, message ) {
	console.log( "Failed to open file: " + code + " - " + message );

	this.errorMessage = message;
	this.setState( TextFile.State.error );
};

TextFile.prototype.updateFailure = function( job, code, message ) {
	console.log( "Failed to push an update to the server: " + code + " - " + message );
};

TextFile.prototype.contentChanged = function( details ) {
	new JobHandle( {
		job: 'update',
		args: {
			rfid: this.rfid,
			details: details,
		},
		onFailure: this.updateFailure.bind( this ),
	} );
};

TextFile.prototype.save = function( checksum ) {
	new JobHandle( {
		job: 'save',
		args: {
			rfid: this.rfid,
			c: checksum,
		},
		onSuccess: function() {
			console.log( 'Saved!' );
		},
	} );
};

document.addEventListener( 'DOMContentLoaded', function() {
    //  Register me as a filehandle!
    FileTypeManager.registerFileHandler( 'text', TextFile );
} );
