//
//	Settings - get and set options via ipc.
//

var Settings = {

	get: function( key, defaultValue ) {
		return ipc.sendSync( 'Settings.get', key, defaultValue );
	},
	
	set: function( key, value ) {
		return ipc.sendSync( 'Settings.set', key, value );
	}

};
