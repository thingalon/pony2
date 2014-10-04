//
//	Common types, enums, etc.
//

var isNode = ( typeof exports !== 'undefined' );

( function( Type ) {

	//	Path types
	Type.path = {
		local: 0,
		ssh: 1,
	};

} ( isNode ? exports : this.Type = {} ) );

