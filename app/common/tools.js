//
//	Tools; contains misc useful standalone functions.
//

var isNode = ( typeof exports !== 'undefined' );
if ( isNode ) {
	var Type = require( './type.js' );
}

( function( Tools ) {

	//	Load the contents of a <template> block into the target DOM element
	Tools.loadTemplate = function( target, template ) {
		var t = $( $( 'template#' + template + '-template' ).html() );
		target.append( t );
		return t;
	}

	//	Handy helper to ensure callbacks get called with the right 'this'.
	Tools.cb = function( object, fn, extra ) {
		return function() {
			var args = [];
			if ( extra != null )
				args.push( extra );
			Array.prototype.push.apply( args, arguments );

			fn.apply( object, args );
		}
	}
	
	//	Split a path into its components
	Tools.splitPath = function( path ) {
		//	This is an ssh:// path?
		var sshRegex = new RegExp( '^ssh://(?:([^@]+)@)?([^/]+)(/?.*)$' );
		var result = sshRegex.exec( path );
		if ( result ) {
			var remotePath = result[3];
			if ( ! remotePath.startsWith( '/' ) )
				remotePath = '/' + remotePath;

			return {
				type: Type.path.ssh,
				user: result[1],
				host: result[2],
				path: remotePath,
			};
		} else {
			return {
				type: Type.path.local,
				path: path,
			};
		}
	}
	
	//	Returns true of the specified path is remote.
	Tools.isPathRemote = function( path ) {
		var pieces = Tools.splitPath( path );
		return pieces.type == Type.path.ssh;
	}
	
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
		
		return Tools.joinPath( pieces );
	}
	
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
	}
	
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
	}
	
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
	}
	
	//	UI: Create an outlined icon using FontAwesome's -o notation and stacking
	Tools.iconStack = function( icon, color ) {
		var span = $( '<span>' ).addClass( 'fa-stack' );
		span.append( $( '<i>' ).addClass( 'fa fa-stack-1x ' + icon ).css( 'color', color ) );
		span.append( $( '<i>' ).addClass( 'fa fa-stack-1x ' + icon + '-o' ) );
		return span;
	}
	
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

