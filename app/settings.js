var ipc = require( 'ipc' );
var app = require( 'app' );
var fs = require( 'fs' );

var settingsFile = null;
var settings = {};

function initSettings() {
	if ( settingsFile )
		return;

	//	Figure out where to keep settings on this platform.
	if ( process.platform == 'win32' ) {
		console.log( 'Hey! settings.js needs to learn where to put settings on Windows!' );
		app.quit();
	} else {
		var settingsDir = process.env.HOME + '/.pony2/';
	}
	
	//	Ensure settings directory exists
	if ( ! fs.existsSync( settingsDir ) ) {
		fs.mkdirSync( settingsDir, 0700 )
		if ( ! fs.existsSync( settingsDir ) ) {
			console.log( 'Failed to create ' + settingsDir + ' for settings. :(' );
			app.quit();
		}
	}
	
	//	Read the settings file if one exists
	settingsFile = settingsDir + 'settings.json';
	if ( fs.existsSync( settingsFile ) ) {
		settings = JSON.parse( fs.readFileSync( settingsFile, 'utf8' ) );
	}
}

function saveSettings() {
	fs.writeFileSync( settingsFile, JSON.stringify( settings ) );
}

exports.set = function( key, value ) {
	initSettings();
	
	settings[ key ] = value;
	saveSettings();
}

exports.get = function( key, defaultValue ) {
	initSettings();
	
	if ( settings.hasOwnProperty( key ) )
		return settings[ key ];
	return defaultValue;
}

ipc.on( 'Settings.set', function( event, key, value ) {
	exports.set( key, value );
	event.returnValue = true;
} );

ipc.on( 'Settings.get', function( event, key, defaultValue ) {
	event.returnValue = exports.get( key, defaultValue );
} );
