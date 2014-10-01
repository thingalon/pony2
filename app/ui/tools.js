( function( Tools ) {

	//	Handy helper to ensure callbacks get called with the right 'this'.
	Tools.cb = function( object, fn ) {
		return function() {
			fn.apply( object, arguments );
		}
	}

} )( window.Tools = window.Tools || {} );