//
//	Load jQuery, and add a couple of useful helper methods.
//

window.$ = window.jQuery = require('./vendor/jquery/jquery-2.1.1.min.js');

//	Handy onEnter event binder. Saves rewriting a keyup body for enter receivers.
$.fn.onEnter = function( callback ) {
	this.keyup( function( e ) {
		if ( e.keyCode == 13 ) {
			callback.apply( this );
		}
	} );
	return this;
}

