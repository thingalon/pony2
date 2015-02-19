//
//	TextConduit - A conduit for edit-streaming a utf-8 text file.
//

function TextConduit( path ) {
	this.path = path;
	this.state = TextConduit.State.closed;
	this.rfid = TextConduit.nextRfid++;
    
    //  Guess the syntax of this file. 
    var aceMode = ace.modelist.getModeForPath( this.path );
    this.syntax = {
        name: aceMode.caption,
        mode: aceMode.mode,
    };
    
    this.open();
}

TextConduit.openConduits = {};
TextConduit.open = function( filename ) {
    if ( TextConduit.openConduits[ filename ] )
        return TextConduit.openConduits[ filename ];
    return new TextConduit( filename );
}

TextConduit.nextRfid = 1;	//	Remote File ID. Used to bind jobs for this file to one worker tunnel.
TextConduit.State = {
	closed: 0,
	opening: 1,
	open: 2,
	error: 3,
};

TextConduit.prototype.onStateChange = function( callback ) {
	this.stateChangeCb = callback;
};

TextConduit.prototype.getState = function() {
    return this.state;
};

TextConduit.prototype.setState = function( newState ) {
	if ( newState == this.state )
		return;
	
	this.state = newState;
	
	if ( this.stateChangeCb )
		this.stateChangeCb( this );
};

TextConduit.prototype.open = function() {
	this.setState( TextConduit.State.opening );

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

TextConduit.prototype.openSuccess = function( job, result ) {
	this.remoteChecksum = result.r.checksum;
	this.dos = result.r.dos;
    
    this.document = new ace.Document( result.r.content );
    
    this.setState( TextConduit.State.open );
};

TextConduit.prototype.openFailure = function( job, code, message ) {
	console.log( "Failed to open file: " + code + " - " + message );

	this.errorMessage = message;
	this.setState( TextConduit.State.error );
};

TextConduit.prototype.updateFailure = function( job, code, message ) {
	console.log( "Failed to push an update to the server: " + code + " - " + message );
};

TextConduit.prototype.contentChanged = function( details ) {
	new JobHandle( {
		job: 'update',
		args: {
			rfid: this.rfid,
			details: details,
		},
		onFailure: this.updateFailure.bind( this ),
	} );
};

TextConduit.prototype.save = function( checksum ) {
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
