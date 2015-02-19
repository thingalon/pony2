//
//	Tools; contains misc useful standalone functions.
//

var isNode = ( typeof exports !== 'undefined' );
if ( isNode ) {
	var Type = require( './type.js' );
}

( function( Tools ) {

	//	Split a path into its components
	Tools.splitPath = function( path ) {
        //  Does this look like a remote path? Accept both "ssh://user@server/path" and "user@server:path"
        var sshRegex = new RegExp( '^(?:ssh:\/\/(?:(?:[^@]+)@)?(?:[^\/]+)(?:.*)|(?:([^@\/]+)@)?([^:]+):(.*))$' );
        var result = sshRegex.exec( path );
        if ( result ) {
            //  This is a remote path.
            var remotePath = result[3];
            console.log( remotePath );
            console.log( JSON.stringify( result ) );
			if ( ! remotePath.startsWith( '/' ) )
				remotePath = '/' + remotePath;

            return {
                type: Type.path.ssh,
                user: result[1],
                host: result[2],
                path: remotePath
            };
        } else {
            //  Assume local.
			if ( ! path.startsWith( '/' ) )
				path = '/' + path;

            return {
                type: Type.path.local,
                user: null,
                host: null,
                path: path,
            };
        }
	};
	
	//	Returns true of the specified path is remote.
	Tools.isPathRemote = function( path ) {
		var pieces = Tools.splitPath( path );
		return pieces.type == Type.path.ssh;
	};
	
	//	Returns the parent of the specified path (if one exists), otherwise false.
	Tools.parentPath = function( path ) {
		var pieces = Tools.splitPath( path );
		var hostPath = pieces.path;
		
		//	Split the path, drop the last word
		var names = hostPath.split( '/' ).filter( function( s ) { return s != ''; } );
		if ( names.length == 0 )
			return false;
		names.pop();
		pieces.path = names.join( '/' );
        
        if ( pieces.type == Type.path.local )
            pieces.path = '/' + pieces.path;
		
		return Tools.joinPath( pieces );
	};
	
	//	Come up with a short, pretty description of a path
	Tools.describePath = function( path ) {
		var pieces = Tools.splitPath( path );
		var folders = pieces.path.split( '/' );
		
		do {
			var name = folders.pop();
		} while ( name.length == 0 && folders.length > 0 );
		
		if ( pieces.type == Type.path.ssh )
			return name + ' on ' + pieces.host;
		else
			return name + ' (local)';
	};
	
	//	Combines a split path back into a string
	Tools.joinPath = function( pathPieces ) {
		if ( pathPieces.type == Type.path.ssh ) {
			var path = 'ssh://';
			if ( pathPieces.user )
				path += pathPieces.user + '@';
			path += pathPieces.host;
			
			if ( ! pathPieces.path.startsWith( '/' ) )
				path += '/';
			path += pathPieces.path;
			
			return path;
		} else {
			return pathPieces.path;
		}
	};
	
	//	Display a filesize in a human-readable format
	Tools.prettySize = function( size ) {
		//	Using KB, MB, etc. Maybe we can add a config later for KiB / MiB if anyone cares.
		if ( size < 1000 )
			return size + ' B';
		if ( size < 1000000 )
			return ( size / 1000 ).toFixed( 1 ) + ' KB';
		if ( size < 1000000000 )
			return ( size / 1000000 ).toFixed( 1 ) + ' MB';
		if ( size < 1000000000000 )
			return ( size / 1000000000 ).toFixed( 1 ) + ' GB';
		else
			return ( size / 1000000000000 ).toFixed( 1 ) + ' TB';
	};
    
    Tools.pad = function( number, width, padding ) {
        padding = padding || '0';
        number = number + '';
        return number.length >= width ? number : new Array( width - number.length + 1 ).join( padding ) + number;
    };
    
} ( isNode ? exports : this.Tools = {} ) );

//
//	Handy extensions for core types.
//

String.prototype.endsWith = function( suffix ) {
    return this.indexOf( suffix, this.length - suffix.length ) !== -1;
};

String.prototype.startsWith = function( prefix ) {
	if ( this.length < prefix.length )
		return false;
	return this.substr( 0, prefix.length ) == prefix;
}

String.prototype.contains = function( substring ) {
    return this.indexOf( substring ) !== -1;
};

Date.prototype.isToday = function() {
    var justTheDate = new Date( this ).setHours( 0, 0, 0, 0 );
    var today = new Date().setHours( 0, 0, 0, 0 );
    
    return ( justTheDate == today );
}

Date.prototype.prettyTimestamp = function() {
    if ( this.isToday() ) {
        //  If the date is today, just print the time.
        var hour = this.getHours();
        if ( hour > 12 ) {
            hour -= 12;
            var suffix = ' PM';
        } else {
            var suffix = ' AM';
        }
        return hour + ':' + Tools.pad( this.getMinutes(), 2 ) + suffix;
    } else {
        //  If the date is not today, output the date.
        var date = this.getDate() + ' ';
        date += [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ][ this.getMonth() ];
        
        if ( this.getYear() != ( new Date() ).getYear() )
            date += ' ' + ( this.getYear() + 1900 );
        
        return date;
    }
}

Object.defineProperty( Object.prototype, 'map', {
	value: function( f ) {
		var self = this;
		var result = {};
		for ( var key in this )
			result[ key ] = f.call( this, key, this[ key ] );
        return result;
    }
});

Buffer.prototype.chop = function( bytes ) {
	if ( this.length > bytes ) {
		var choppedBuffer = new Buffer( this.length - bytes );
		this.copy( choppedBuffer, 0, bytes );
		return choppedBuffer;
	}
	
	return new Buffer( 0 );
}
