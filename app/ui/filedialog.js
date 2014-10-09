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

	//	Hook up UI controls.
	this.e.find( 'button.up' ).click( Tools.cb( this, this.upClicked ) );

	dialog = this;
	this.e.find( 'input.path' ).keyup( function( e ) {
		if ( e.keyCode == 13 ) 
			dialog.showPath( $( this ).val() );
	} ).focusin();
	
	//	Show a path
	if ( this.args.path )
		this.showPath( this.args.path );
}

FileDialog.prototype.showPath = function( path ) {
	if ( this.path == path )
		return;
		
	this.path = path;
	
	//	Update DOM
	this.e.find( 'input.path' ).val( path );
	this.e.find( 'div.files' ).empty().addClass( 'loading' ).html( 'Loading...' );
	
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
		
		var row = $( '<tr>' )
			.addClass( i % 2 == 0 ? 'first' : 'second' )
			.data( 'details', details )
			.data( 'filename', filename );

		//	Show a filename and an icon
		var filenameCell = $( '<td>' )
		if ( isDir )
			filenameCell.append( Tools.iconStack( 'fa-folder', '#f90' ) );
		else
			filenameCell.append( Tools.iconStack( 'fa-file', '#fff' ) );
			
		filenameCell.append( filename );
		row.append( filenameCell );
		
		//	Show a size (if this is not a directory)
		row.append( $( '<td>' ).html( isDir ? '' : Tools.prettySize( details.s ) ) );
		
		//	Show a last edit time, if available.
		row.append( $( '<td>' ).html( details.m > 0 ? new Date( details.m ).toLocaleString() : '' ) );
		
		var rowDetails = { row: row, filename: filename, details: details, isDir: isDir };
		row.click( Tools.cb( this, this.rowClicked, rowDetails ) );
		row.dblclick( Tools.cb( this, this.rowDoubleClicked, rowDetails ) );

		table.append( row );
	}
	
	this.e.find( 'div.files' ).empty().removeClass( 'loading' ).append( table );
}

FileDialog.prototype.rowClicked = function( args, event ) {
	//	Selection logic not done yet.
}

FileDialog.prototype.rowDoubleClicked = function( args ) {
	var selected = this.path;
	if ( selected.substr( -1 ) != '/' )
		selected += '/';
	selected += args.filename;
	
	if ( args.isDir ) {
		this.showPath( selected );
	} else {
		this.e.remove();
		alert( 'Open ' + selected );
	}
}

FileDialog.prototype.upClicked = function() {
	var upPath = Tools.parentPath( this.path );
	if ( upPath )
		this.showPath( upPath );
}

//	Called when an 'ls' remote call comes back a failure.
FileDialog.prototype.lsFailure = function( job, code, message ) {
	alert( 'Failed to open file: ' + message );
}
