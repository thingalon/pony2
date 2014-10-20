//
//	File Manager; tracks open files
//

( function( FileManager ) {

	var openFiles = [];
	
	function addFile( file ) {
		openFiles.push( file );

		//	Keep files sorted by full path. (Allows for consistent ordering throughout UI)
		openFiles = openFiles.sort( function( a, b ) {
			if ( a.path >= b.path )
				return 1;
			if ( b.path >= a.path )
				return -1;
			return 0;
		} );
	}

	FileManager.open = function( path ) {
		var file;	
		if ( Tools.isPathRemote( path ) )
			file = new RemoteFile( path );
		else
			console.log( "Local files not supported yet." );
		
		if ( file ) {
			addFile( file );
			file.open();
		}
		
		return file;
	}

} ( window.FileManager = {} ) );


