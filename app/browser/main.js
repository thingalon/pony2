var BrowserJobRequest = require( './browserjobrequest.js' );
var settings = require( './settings.js' );
var app = require( 'app' );
var BrowserWindow = require( 'browser-window' );
var ipc = require( 'ipc' );
var path = require( 'path' );

var Browser = {
    mainWindow: null,
};

process.on( 'uncaughtException', function( err ) {
    console.error( err.stack );
} );

Browser.start = function() {
    //	On window close, quit.
    app.on( 'window-all-closed', app.quit.bind( app ) );

    //  Open the browser window when the app is ready.
    app.on( 'ready', this.openBrowser.bind( this ) );
};

Browser.openBrowser = function() {
    //  Create the browser window.
    this.mainWindow = new BrowserWindow( {
        width: 1024,
        height: 768,
    } );
    
    //	Open the developer console when requested
    ipc.on( 'show-console', this.mainWindow.openDevTools.bind( this.mainWindow ) );
    
    //  On close, lose the reference.
    this.mainWindow.on( 'closed', function() {
        this.mainWindow = null;
    } );
    
    //  Load the UI main page.
    this.mainWindow.loadUrl( 'file://' + __dirname + '/../client/index.html' );
    this.mainWindow.focus();
}

module.exports = Browser;
