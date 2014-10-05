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
		
	this.path = path;
	
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
	if ( job.getArg( 'path' ) != this.path )
		return;
	
	var table = $( '<table>' );
	
	//	Header
	var header = $( '<tr>' ).addClass( 'head' );
	var headings = [ 'Filename', 'Size', 'Last Modified' ];
	for ( var i = 0; i < headings.length; i++ )
		header.append( $( '<th>' ).html( headings[ i ] ) );
	table.append( header );
	
	//	Sort filenames (directories first)
	var keys = [];
	for ( var i in result.entries )
		keys.push( i );
	keys = keys.sort( function( a, b ) {
		var aIsDir = ( result.entries[ a ].f.indexOf( 'd' ) !== -1 );
		var bIsDir = ( result.entries[ b ].f.indexOf( 'd' ) !== -1 );
		
		if ( aIsDir && ! bIsDir )
			return -1;
		else if ( ! aIsDir && bIsDir )
			return 1;
		else if ( a < b )
			return -1;
		else
			return 1;
	} );
	
	//	Display files
	for ( var i = 0; i < keys.length; i++ ) {
		var filename = keys[ i ];
		var details = result.entries[ filename ];
		var isDir = ( details.f.indexOf( 'd' ) !== -1 );
		
		var row = $( '<tr>' ).addClass( i % 2 ? 'second' : 'first' );
		row.append( $( '<td>' ).html( filename ) );
		row.append( $( '<td>' ).html( isDir ? '' : Tools.prettySize( details.s ) ) );
		row.append( $( '<td>' ).html( details.m > 0 ? new Date( details.m * 1000 ).toLocaleString() : '' ) );

		table.append( row );
	}
	
	this.e.find( 'div.files' ).empty().removeClass( 'loading' ).append( table );
}

//	Called when an 'ls' remote call comes back a failure.
FileDialog.prototype.lsFailure = function( job, code, message ) {
	alert( 'Failed to open file: ' + message );
}
