process.argv = [ 'foo', 'bar', '--reporter', '/Users/mark/Projects/pony2/test/lib/nodeunit-reporter.js' ];
process.removeAllListeners( 'uncaughtException' );

process.on( 'uncaughtException', function( err ) {
    console.log( 'Caught exception: ' + err );
    console.trace();
} );

var app = require( 'app' );
app.commandLine.appendSwitch( 'v', -1 );
app.commandLine.appendSwitch( 'vmodule', 'console=0' );

app.on( 'ready', function() {
    require( 'nodeunit/bin/nodeunit' );
} );