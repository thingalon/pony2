var Tools = require( '../app/common/tools.js' );

exports.Tools = {

    'can split ssh:// formatted path': function( test ) {
        var testPath = 'ssh://username@hostname.com/~/some/path/file.txt';
        var pieces = Tools.splitPath( testPath );
        test.notEqual( pieces, false, 'Should split happily' );
        test.equal( pieces.user, 'username' );
        test.equal( pieces.host, 'hostname.com' );
        test.equal( pieces.path, '/~/some/path/file.txt' );
        test.done();
    },
    
    'can split host: formatted path': function( test ) {
        var testPath = 'username@hostname.com:~/some/path/file.txt';
        var pieces = Tools.splitPath( testPath );
        test.notEqual( pieces, false, 'Should split happily' );
        test.equal( pieces.user, 'username' );
        test.equal( pieces.host, 'hostname.com' );
        test.equal( pieces.path, '/~/some/path/file.txt' );
        test.done();
    },
    
    'can split local path': function( test ) {
        var testPath = '~/some/path/file.txt';
        var pieces = Tools.splitPath( testPath );
        test.notEqual( pieces, false, 'Should split happily' );
        test.equal( pieces.user, null );
        test.equal( pieces.host, null );
        test.equal( pieces.path, '/~/some/path/file.txt' );
        test.done();
    },
    
    'can detect ssh:// formatted path as remote': function( test ) {
        var testPath = 'ssh://username@hostname.com/~/some/path/file.txt';
        test.equal( Tools.isPathRemote( testPath ), true );
        test.done();
    },
    
    'can detect host: formatted path as remote': function( test ) {
        var testPath = 'username@hostname.com:~/some/path/file.txt';
        test.equal( Tools.isPathRemote( testPath ), true );
        test.done();
    },
    
    'can detect local path as local': function( test ) {
        var testPath = '~/some/path/file.txt';
        test.equal( Tools.isPathRemote( testPath ), false );
        test.done();
    },
    
    'will return correct parents for ssh:// formatted paths': function( test ) {
        var lineage = [
            'ssh://username@hostname.com/~/some/path/file.txt',
            'ssh://username@hostname.com/~/some/path',
            'ssh://username@hostname.com/~/some',
            'ssh://username@hostname.com/~',
            'ssh://username@hostname.com/',
            false,
        ];
        for ( var i = 0; i < lineage.length - 1; i++ ) {
            test.equal( Tools.parentPath( lineage[ i ] ), lineage[ i + 1 ] );
        }
        test.done();
    },
    
    'will return correct parents for host: formatted paths': function( test ) {
        var lineage = {
            'username@hostname.com:~/some/path/file.txt': 'ssh://username@hostname.com/~/some/path',
            'username@hostname.com:~/some/path': 'ssh://username@hostname.com/~/some',
            'username@hostname.com:~/some': 'ssh://username@hostname.com/~',
            'username@hostname.com:~': 'ssh://username@hostname.com/',
            'username@hostname.com:/': false,
        };
        for ( var i in lineage ) {
            test.equal( Tools.parentPath( i ), lineage[ i ] );
        }
        test.done();
    },
    
    'will return correct parents for local paths': function( test ) {
        var lineage = [
            '~/some/path/file.txt',
            '/~/some/path',
            '/~/some',
            '/~',
            '/',
            false,
        ];
        for ( var i = 0; i < lineage.length - 1; i++ ) {
            test.equal( Tools.parentPath( lineage[ i ] ), lineage[ i + 1 ] );
        }
        test.done();
    },
    
    'can describe remote paths': function( test ) {
        test.equal( Tools.describePath( 'ssh://username@hostname.com/~/foo/bar' ), 'bar on hostname.com' );
        test.equal( Tools.describePath( 'username@hostname.com:~/foo/bar/baz/' ), 'baz on hostname.com' );
        test.done();
    },
    
    'can describe local paths': function( test ) {
        test.equal( Tools.describePath( '~/foo/bar' ), 'bar (local)' );
        test.equal( Tools.describePath( '~/foo/bar/' ), 'bar (local)' );
        test.done();
    },
    
    'can make file sizes pretty': function( test ) {
        test.equal( Tools.prettySize( 1 ), '1 B' );
        test.equal( Tools.prettySize( 10 ), '10 B' );
        test.equal( Tools.prettySize( 1000 ), '1.0 KB' );
        test.equal( Tools.prettySize( 1500 ), '1.5 KB' );
        test.equal( Tools.prettySize( 1000000 ), '1.0 MB' );
        test.equal( Tools.prettySize( 1500000 ), '1.5 MB' );
        test.equal( Tools.prettySize( 1000000000 ), '1.0 GB' );
        test.equal( Tools.prettySize( 1500000000 ), '1.5 GB' );
        test.equal( Tools.prettySize( 1000000000000 ), '1.0 TB' );
        test.equal( Tools.prettySize( 1500000000000 ), '1.5 TB' );
        test.done();
    },
    
    'can detect string suffixes (endsWith)': function( test ) {
        test.equal( 'monkey foobar'.endsWith( 'foobar' ), true );
        test.equal( 'monkey foobar'.endsWith( 'foo' ), false );
        test.done();
    },
    
    'can detect string prefixes (startsWith)': function( test ) {
        test.equal( 'monkey foobar'.startsWith( 'monkey' ), true );
        test.equal( 'monkey foobar'.startsWith( 'key' ), false );
        test.done();
    },
    
    'can check if a string contains a substring': function( test ) {
        test.equal( 'monkey foobar'.contains( 'key foo' ), true );
        test.equal( 'monkey foobar'.contains( 'kee boo' ), false );
        test.done();
    },
    
    'can check if a date is today': function( test ) {
        var testDate = new Date();
        test.equals( testDate.isToday(), true );
        
        testDate.setHours( 12, 0, 0, 0 );
        test.equal( testDate.isToday(), true );
        
        test.equal( new Date( '1970-01-01' ).isToday(), false );
        test.done();
    },
    
    'can pretty up a timestamp': function( test ) {
        var testDate = new Date();
        
        testDate.setHours( 12, 0, 0 );
        test.equal( testDate.prettyTimestamp(), '12:00 PM' );
        
        testDate.setMonth( 0 );
        testDate.setDate( 1 );
        test.equal( testDate.prettyTimestamp(), '1 Jan' );
        
        test.equal( new Date( '2000-05-05' ).prettyTimestamp(), '5 May 2000' );
        
        test.done();
    },
    
    'can run map on an Object': function( test ) {
        var testObject = {
            a: 1,
            b: 2,
            c: 3,
        };
        
        var result = Tools.mapObject( testObject, function( key, value ) {
            return value + 1;
        } );
        
        test.deepEqual( result, { a: 2, b: 3, c: 4 } );
        test.done();
    },
    
    'can chop bytes from the start of a Buffer': function( test ) {
        var buffer = new Buffer( 'test' );
        var chopped = buffer.chop( 2 );
        test.equal( chopped.toString(), 'st' );
        test.done();
    },
    
    'can pull the folder name component from a path': function( test ) {
        test.equals( Tools.folderName( 'foobar.txt' ), '/' );
        test.equals( Tools.folderName( '/foo/bar/baz.txt' ), '/foo/bar/' );
        test.done();
    },
    
    'can pull the file name component from a path': function( test ) {
        test.equals( Tools.filename( 'foobar.txt' ), 'foobar.txt' );
        test.equals( Tools.filename( '/foo/bar/baz.txt' ), 'baz.txt' );
        test.done();
    },

};