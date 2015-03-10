var FileBuffer = require( '../app/worker/filebuffer.js' );
var path = require( 'path' );
var fs = require( 'fs' );
var crypto = require( 'crypto' );

exports.filebuffer = {
    
    setUp: function( callback ) {
        this.testFilePath = path.join( __dirname, 'test-filebuffer.txt' );
        this.testFileContents = fs.readFileSync( this.testFilePath );
        callback();
    },
    
    'reports an error when opening a non-existent file': function( test ) {
        var fb = new FileBuffer( 1, path.join( __dirname, 'doesnt-exist.txt' ) );
        fb.open( function success() {
            test.ok( false, 'Should have returned an error message!' );
            test.done();
        }.bind( this ), function failure( err ) {
            test.ok( true );
            test.done();
        }.bind( this ) );
    },
    
    'can open a test file': function( test ) {
        var fb = new FileBuffer( 1, this.testFilePath );
        fb.open( function success() {
            test.ok( true, 'Success!' );
            test.equals( fb.getContent(), this.testFileContents );
            test.done();
        }.bind( this ), openError( test ) );
    },
    
    'can checksum a test file': function( test ) {
        var fb = new FileBuffer( 1, this.testFilePath );
        fb.open( function success() {
            test.equals( fb.getChecksum(), crypto.createHash( 'md5' ).update( this.testFileContents ).digest( 'hex' ) );
            test.done();
        }.bind( this ), openError( test ) );
    },
    
    'can add text to a test file': function( test ) {
        var fb = new FileBuffer( 1, this.testFilePath );
        fb.open( function success() {
            fb.modify( {
                t: 'New Text!\n',
                p: 7
            } );
            test.equals( fb.getContent(), 'hello.\nNew Text!\nthis is text.' );
            test.done();
        }.bind( this ), openError( test ) );
    },
    
    'can delete text from a test file': function( test ) {
        var fb = new FileBuffer( 1, this.testFilePath );
        fb.open( function success() {
            fb.modify( {
                d: 7,
                p: 0
            } );
            test.equals( fb.getContent(), 'this is text.' );
            test.done();
        }.bind( this ), openError( test ) );
    },
    
    'will refuse to save when an incorrect checksum is supplied': function( test ) {
        var fb = new FileBuffer( 1, this.testFilePath );
        fb.open( function success() {
            fb.save( 't0tallyn0tval1d', function success() {
                test.ok( false, 'Should not have saved.' );
                test.done();
            }, function failure() {
                test.ok( true );
                test.done();
            } );
        }.bind( this ), openError( test ) );
    },
    
    'will save when a correct checksum is supplied': function( test ) {
        var fb = new FileBuffer( 1, this.testFilePath );
        fb.open( function success() {
            fb.path = '/tmp/test-save.txt';
            fb.save( fb.getChecksum(), function success() {
                var savedContent = fs.readFileSync( fb.path );
                test.equals( savedContent.toString(), this.testFileContents.toString() );
                fs.unlinkSync( fb.path );
                test.done();
            }.bind( this ), function failure() {
                test.ok( false, 'Should have saved.' );
                test.done();
            }.bind( this ) );
        }.bind( this ), openError( test ) );
    },
    
};

function openError( test ) {
    return function() {
        test.ok( false, 'Failed to open test file!' );
        test.done();
    };
}
