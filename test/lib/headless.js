try {
    require.resolve( 'app' );
    require.resolve( 'browser-window' );
} catch( e ) {
    console.log( '*** These tests should be run with "grunt test"; it will run them in a headless Atom-shell environment ***' );
    process.exit( e.code );
}

var BrowserWindow = require( 'browser-window' );

var Headless = {};
module.exports = Headless;

Headless.openBrowser = function( readyCallback ) {
    this.window = new BrowserWindow( { show: false } );
    
    this.window.webContents.on( 'did-finish-load', function( event ) {
        readyCallback();
    } );
    
    this.window.loadUrl( 'file://' + __dirname + '/../../app/client/index.html' );
};

Headless.closeBrowser = function() {
    if ( this.window ) {
        this.window.close();
        this.window = null;
    }
};
