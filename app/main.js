var app = require( 'app' );
var BrowserWindow = require( 'browser-window' );
var Job = require( './job.js' );
var ipc = require( 'ipc' );
var settings = require( './settings.js' );

require('crash-reporter').start();

//	On window close, quit.
app.on( 'window-all-closed', function() {
	if ( process.platform != 'darwin' )
		app.quit();
} );

//	Open the developer console when requested
ipc.on( 'show-console', function() {
	mainWindow.openDevTools();
} );


//	Create the main window, load the main UI
var mainWindow = null;
app.on( 'ready', function() {
	mainWindow = new BrowserWindow( {
		width: 1024,
		height: 768,
	} );

	mainWindow.loadUrl('file://' + __dirname + '/ui/index.html');
	
	mainWindow.on('closed', function() {
		mainWindow = null;
	});
	
	mainWindow.focus();
} );
