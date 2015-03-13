var ssh2 = require( 'ssh2' );
var path = require( 'path' );
var fs = require( 'fs' );
var crypto = require( 'crypto' );
var Host = require( path.join( __dirname, '../../app/browser/host.js' ) );

function TestSshServer( onReady ) {
    this.start( onReady );
}
module.exports = TestSshServer;

TestSshServer.prototype = {
    start: function( onReady ) {
        this.shellReadBuffer = '';
        this.shellDataHandler = null;
        
        this.handle = new ssh2.Server( {
            privateKey: fs.readFileSync( path.join( __dirname, '../data/server.rsa' ) ),
        }, this.onConnect.bind( this ) );
        
        crypto.randomBytes(48, function(ex, buf) {
            this.password = buf.toString('hex');

            var server = this;
            this.handle.listen( 0, '127.0.0.1', function() {
                server.port = this.address().port;
                onReady();
            } );
        }.bind( this ) );
    },
    
    stop: function() {
        if ( this.shellChannel ) {
            this.shellChannel.close();
            this.shellChannel = null;
        }
        
        if ( this.session ) {
            this.session = null;
        }
        
        if ( this.handle ) {
            this.handle.close();
            this.handle = null;
        }
    },
    
    //  Creates a host object ready to connect to this test server.
    createHostObject: function() {
        var testHost = new Host( 'test-user', '127.0.0.1', this.port );
        testHost.password = this.password;
        return testHost;
    },
    
    //  Tells this server to respond with a particular init response, rather than a happy connection
    setInitResponse: function( response ) {
        this.initResponse = response;
    },
    
    onConnect: function( client ) {
        client.on( 'authentication', this.authenticateClient.bind( this, client ) );
        client.on( 'session', this.openSession.bind( this, client ) );
    },
    
    authenticateClient: function( client, auth ) {
        if ( auth.method == 'password' && auth.username == 'test-user' && auth.password == this.password )
            auth.accept();
        else
            auth.reject();
    },
    
    openSession: function( client, accept, reject ) {
        if ( this.session ) {   //  One at a time only.
            reject();
            return;
        }
        
        this.session = accept();
        
        this.session.once( 'pty', function( accept, reject, info ) {
            accept();
        } );
        
        this.session.once( 'shell', this.openShell.bind( this ) );
    },
    
    openShell: function( accept, reject ) {
        if ( this.channel ) {   //  One at a time only.
            reject();
            return;
        }
        
        this.shellChannel = accept();
        this.shellChannel.on( 'data', this.onShellData.bind( this ) );
        this.shellDataHandler = this.expectInitCommand.bind( this );
    },
    
    onShellData: function( data ) {
        if ( this.shellChannel == null )
            return;
        
        if ( this.shellDataHandler )
            this.shellDataHandler( data );
    },
    
    expectInitCommand: function( data ) {
        this.shellReadBuffer += data;
        
        var truncatedReadBuffer = this.shellReadBuffer.substr( 0, Host.initCommand.length );
        if ( truncatedReadBuffer == Host.initCommand ) {
            //  Success! Send a shell prompt.
            this.shellReadBuffer = '';
            this.shellDataHandler = null;
            
            this.respondToInit();
            
            return;
        }
        
        if ( truncatedReadBuffer != Host.initCommand.substr( 0, truncatedReadBuffer ) ) {
            //  Invalid data received :( 
            console.log( 'Invalid data received: ' + this.shellReadBuffer );
            this.stop();
            return;
        }
    },
    
    respondToInit: function() {
        if ( this.initResponse ) {
            this.shellChannel.write( this.initResponse + '\n' + Host.shellPrompt );
            return;
        }
    },
}
