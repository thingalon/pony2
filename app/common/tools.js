//
//	Tools; contains misc useful standalone functions.
//

var isNode = ( typeof exports !== 'undefined' );
if ( isNode ) {
	var Type = require( './type.js' );
}

( function( Tools ) {

	//	Handy helper to ensure callbacks get called with the right 'this'.
	Tools.cb = function( object, fn ) {
		return function() {
			fn.apply( object, arguments );
		}
	}
	
	//	Split a path into its components
	Tools.splitPath = function( path ) {
		//	This is an ssh:// path?
		var sshRegex = new RegExp( '^ssh://(?:([^@]+)@)?([^/]+)(/.*)$' );
		var result = sshRegex.exec( path );
		if ( result ) {
			return {
				type: Type.path.ssh,
				user: result[1],
				host: result[2],
				path: result[3],
			};
		} else {
			return {
				type: Type.path.local,
				path: path,
			};
		}
	}
	
} ( isNode ? exports : this.Tools = {} ) );

//
//	Handy extensions for core types.
//

String.prototype.endsWith = function( suffix ) {
    return this.indexOf( suffix, this.length - suffix.length ) !== -1;
};

String.prototype.contains = function( substring ) {
    return this.indexOf( substring ) !== -1;
};
