var Jobs = {};
var fs = require( 'fs' );
var FileBuffer = require( './filebuffer.js' );

//
//	ls - fetch a list of files.
//

Jobs.ls = function( message, success, failure ) {
	var path = expandPath( message.a.path );
	var myUid = process.getuid();
	var myGid = process.getgid();

	//	Read directory.
	fs.readdir( path, function( err, files ) {
		if ( err )
			return failure( message, err.errno, 'Failed to read ' + path );
		
		//	Go through and stat each entry, work out some basic details.
		var filesToDo = files.length;
		var fileDetails = {};
		for ( var i = 0; i < files.length; i++ ) {
			( function( file ) {
				if ( file.substr( 0, 1 ) == '.' ) {
					filesToDo--;
					return;
				}
			
				var fullPath = path + '/' + file;
				fs.lstat( fullPath, function statDone( err, stats ) {
					filesToDo--;
					
					var size = 0;
					var flags = '';
					var target = null;
					var lastModified = null;
					
					//	Follow symlinks
					if ( stats && stats.isSymbolicLink() ) {
						flags += 'l';
						try {
							target = fs.readlinkSync( fullPath );
							stats = fs.statSync( fullPath );
						} catch ( e ) {
							stats = null;
						}
						
						if ( ! stats )
							flags += 'b';
					}
					
					if ( stats ) {
						size = stats.size;
						lastModified = stats.mtime.getTime();
						
						if ( stats.isDirectory() )
							flags += 'd';
						
						//	Guess if this file is readable
						if (
							( ( stats.mode & 0400 ) && ( myUid == stats.uid ) ) ||
							( ( stats.mode & 0040 ) && ( myGid == stats.gid ) ) ||
							( ( stats.mode & 0004 ) )
						) {
							flags += 'r';
						}
						
						//	Guess if this file is writable
						if (
							( ( stats.mode & 0200 ) && ( myUid == stats.uid ) ) ||
							( ( stats.mode & 0020 ) && ( myGid == stats.gid ) ) ||
							( ( stats.mode & 0002 ) ) 
						) {
							flags += 'w';
						}
					}
					
					fileDetails[ file ] = { s: size, f: flags, m: lastModified };
					if ( target )
						fileDetails[ file ].t = target;

					//	Check if that was the last call to stat...
					if ( filesToDo <= 0 )
						success( message, fileDetails );
				} );
			} )( files[ i ] );
		}
	} );
};

Jobs.open = function( message, success, failure ) {
    var path = expandPath( message.a.path );
    
    var fb = new FileBuffer( message.a.r, path );
    fb.open( function onSuccess() {
        success( message, {
            content: fb.getContent(),
            checksum: fb.getChecksum(),
            dos: fb.isDosEncoded()
        } );
    }, function onFailure( errorCode, errorString ) {
        failure( message, errorCode, errorString );
    } );
};

//  Modify. Job name shortened to 'm' to keep messages as tight as possible while streaming.
Jobs.m = function( message, success, failure ) {
    var fb = FileBuffer.getByRfid( message.a.r );
    if ( ! fb )
        return failure( message, 'internal_error', 'Unrecognized rfid: ' + message.a.r );
    
    fb.modify( message.a );
    return success( message, {} );
};

Jobs.save = function( message, success, failure ) {
    var fb = FileBuffer.getByRfid( message.a.r );
    if ( ! fb )
        return failure( message, 'internal_error', 'Unrecognized rfid: ' + message.a.r );
    
    fb.save( message.a.content, message.a.c, function onSuccess() {
        success( message, {} );
    }, function onFailure( errorCode, errorString ) { 
        failure( message, errorCode, errorString );
    } );
};

module.exports = Jobs;

function expandPath( path ) {
	//	Expand ~
	var home = process.env.HOME;
	if ( ! /\/$/.test( home ) )
		home += '/';
	path = path.replace( /^\/?~(\/|$)/, home );
	
	return path;
}
