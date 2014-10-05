var app = require( 'app' );
var BrowserWindow = require( 'browser-window' );
var Job = require( './job.js' );

require('crash-reporter').start();

app.on( 'window-all-closed', function() {
	if ( process.platform != 'darwin' )
		app.quit();
} );

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
} );
