//
//	TextConduit - A conduit for edit-streaming a utf-8 text file.
//

function TextConduit( path ) {
	this.path = path;
	this.state = TextConduit.State.closed;
	this.rfid = TextConduit.nextRfid++;
    this.changeBuffer = [];
    
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
            r: this.rfid,
        },
        onSuccess: this.openSuccess.bind( this ),
        onFailure: this.openFailure.bind( this ),
    } );
};

TextConduit.prototype.openSuccess = function( job, result ) {
	this.remoteChecksum = result.r.checksum;
	this.dos = result.r.dos;
    
    this.document = new ace.Document( result.r.content );
    this.document.on( 'change', this.onDocumentChange.bind( this ) );
    
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

TextConduit.prototype.onDocumentChange = function( details ) {
    var change = details.data;
    change.updated = ( new Date() ).getTime();
    
    //  Convert row/col ranges to index positions and normalize.
    change.from = this.document.positionToIndex( change.range.start );
    change.to = this.document.positionToIndex( change.range.end );
    if ( change.to < change.from ) {
        var tmp = change.to;
        change.to = change.from;
        change.from = tmp;
    }
    
    //  Calculate the length of the change. For *Text, you can rely on the supplied text.
    if ( change.action.substr( 6 ) == 'Text' ) {
        change.length = change.text.length;
    } else if ( change.action == 'removeLines' ) {
        change.length = 0;
        for ( var i = 0; i < change.lines.length; i++ )
            change.length += change.lines[ i ].length + 1;
    } else if ( change.action == 'insertLines' ) {
        change.text = change.lines.join( '\n' );
    }
    
    //  Can this change get clumped with the previous one?
    if ( this.changeBuffer.length > 0 ) {
        var lastChange = this.changeBuffer[ this.changeBuffer.length - 1 ];
        
        //  Actions immediately next to each other can get appended / prepended together.
        if ( lastChange.action == change.action ) {
            //  append
            if ( lastChange.to == change.from && change.action == 'insertText' ) {
                lastChange.text += change.text;
                lastChange.to = change.to;
                lastChange.updated = change.updated;
                
                return this.pollChangeQueue();
            }
            
            //  prepend.
            if ( lastChange.from == change.to && change.action == 'removeText' ) {
                lastChange.from = change.from;
                lastChange.updated = change.updated;
                lastChange.length += change.length;
                
                return this.pollChangeQueue();
            }
        }
    }
    
    this.changeBuffer.push( change );
    this.pollChangeQueue();
};

TextConduit.prototype.pollChangeQueue = function() {
    if ( this.changeBuffer.length == 0 )
        return;
    
    if ( this.changeBuffer.length > 5 )
        return this.pushChanges();
    
    if ( this.changeBuffer[ 0 ].updated < ( new Date() ).getTime() - 1000 )
        return this.pushChanges();
    
    setTimeout( this.pollChangeQueue.bind( this ), 500 );
};

TextConduit.prototype.pushChanges = function() {
    for ( var i = 0; i < this.changeBuffer.length; i++ ) {
        var change = this.changeBuffer[ i ];
        var details = null;
        
        switch ( change.action ) {
            case 'insertText':
            case 'insertLines':
                details = {
                    p: change.from,
                    t: change.text,
                };
                break;

            case 'removeText':
            case 'removeLines':
                details = {
                    p: change.from,
                    d: change.length,
                };
                break;
        }
        
        details.r = this.rfid;
        var conduit = this;
        new ClientJobRequest( {
            job: 'm',
            args: details,
            onFailure: function( job, code, message ) {
                this.errorMessage = message;
                console.log( message );
                conduit.setState( TextConduit.State.error );
            },
        } );
    }
    
    this.changeBuffer = [];
}

TextConduit.prototype.save = function() {
    new ClientJobRequest( {
		job: 'save',
		args: {
			r: this.rfid,
			c: CryptoJS.MD5( this.document.getValue() ).toString( CryptoJS.enc.Hex ),
		},
		onSuccess: function() {
			console.log( 'Saved!' );
		},
        onFailure: function( job, code, message ) {
            console.log( 'Failed to save! :(' );
        }
	} );
};
