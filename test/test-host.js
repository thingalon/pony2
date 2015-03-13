var path = require( 'path' );
var TestSshServer = require( path.join( __dirname, 'lib/sshserver.js' ) );
var ErrorHandler = require( path.join( __dirname, 'lib/errorhandler.js' ) );
var Host = require( path.join( __dirname, '../app/browser/host.js' ) );

global.silent = true;

exports.Host = {
    setUp: function( callback ) {
        ErrorHandler.clearIgnores();
        this.server = new TestSshServer( function() {
            callback();
        } );
    },
    
    tearDown: function( callback ) {
        this.server.stop();
        this.server = null;
        callback();
    },
    
    'can throw an error when unable to connect to a host': function( test ) {
        var testHost = this.server.createHostObject();
        testHost.port = 1;
        testDamagedConnection( test, testHost, 'connect ECONNREFUSED' );
    },
    
    'can throw an error when given incorrect credentials': function( test ) {
        var testHost = this.server.createHostObject();
        testHost.password = 'incorrect password.';
        testDamagedConnection( test, testHost, 'All configured authentication methods failed' );
    },
    
    'can throw an error when nodejs is not present on the remote server': function( test ) {
        var testHost = this.server.createHostObject();
        this.server.setInitResponse( 'NO_NODE' );
        testDamagedConnection( test, testHost, 'No Node.js found on the remote server' );
    },
};

function testDamagedConnection( test, testHost, expectedError ) {
    ErrorHandler.ignore( 'stream.push() after EOF' );
    var testDone = false;
        
    var finished = function( ok, message ) {
        if ( ! testDone ) {
            test.ok( ok, message );
            testDone = true;
            testHost.disconnect();
            test.done();
        }
    };

    setTimeout( finished.bind( this, false, 'Timed out' ), 5000 ).unref();
    testHost.on( 'connected', finished.bind( this, false, 'Connection should have failed' ) );

    testHost.on( 'error', function( err ) {
        test.equal( err.message, expectedError );
        finished( true, 'ok' );
    } );

    testHost.connect();
}
