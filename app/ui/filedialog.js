//
//	FileDialog - dialogs for selecting files to open / save to, etc.
//

function FileDialog( args ) {
	var defaults = {};
	this.args = $.extend( defaults, args );

	//	Create DOM elements from a template
	this.e = $( $( 'template#file-dialog-template' ).html() );
	$( '.overlay-layer' ).append( this.e );
	this.e.hide().slideDown();
	
	//	Show a path
	this.showPath( this.args.path );
}

FileDialog.prototype.showPath = function( path ) {
	if ( this.path == path )
		return;
	
	//	Update DOM
	this.e.find( 'input.path' ).val( path );
	this.e.find( 'div.files' ).empty().addClass( 'loading' );
	
	//	Fetch folder content
	this.lsJob = new JobHandle( {
		job: 'ls',
		args: {
			path: path,
		},
		onSuccess: Tools.cb( this, this.lsSuccess ),
		onFailure: Tools.cb( this, this.lsFailure ),
	} );
}

//	Called when an 'ls' remote call comes back successful.
FileDialog.prototype.lsSuccess = function( job, result ) {
	alert( 'Successfully connected to the server. Got date: ' + result );
}

//	Called when an 'ls' remote call comes back a failure.
FileDialog.prototype.lsFailure = function( job, code, message ) {
	alert( 'Failed to open file: ' + message );
}
