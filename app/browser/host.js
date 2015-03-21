//
//	Host - represents a remote ssh host. Use Host.get to find host objects.
//

var Tools = require( '../common/tools.js' );
var WorkerTunnel = require( './workertunnel.js' );

var Connection = require( 'ssh2' ).Client;
var crypto = require( 'crypto' );
var fs = require( 'fs' );
var ChildProcess = require( 'child_process' );
var path = require( 'path' );
var events = require( 'events' );

function Host( user, hostname, port ) {
    this.user = user;
	this.hostname = hostname;
    this.port = port || 22;
    this.isLocal = ( this.hostname == null );

	this.allJobTunnels = [];	//	all 7 tunnels; non-bound jobs can go to the least busy of all
	this.boundJobTunnels = [];	//	5 file-bound tunnels; can take regular jobs, or file-specific ones.
	this.tunnelBindings = {};	//	Maps remote file ids to workertunnels they are bound to

	this.jobQueue = [];
	this.status = Host.state.idle;
}
Host.prototype = new events.EventEmitter;

Host.knownHosts = [];
Host.byRfid = {};
Host.state = {
	idle: 0,
	connecting: 1,
	connected: 2,
};
Host.shellPrompt = '****** PONYEDIT 2 PROMPT ******';

//	At app start-time, load each worker script and its hash.
( function() {
	var scripts = {
		binary: 'binary.js',
        filebuffer: '../worker/filebuffer.js',
		jobs: '../worker/jobs.js',
		worker: '../worker/worker.js',
	};

	Host.workerScripts = {};	
	Host.workerHashes = {};
	for ( var key in scripts ) {
		var path = __dirname + '/' + scripts[ key ];
		var data = fs.readFileSync( path );
		var hash = crypto.createHash( 'md5' ).update( data, 'utf8' ).digest( 'hex' );
		
		Host.workerScripts[ key ] = data;
		Host.workerHashes[ key ] = hash;
	}
} )();

//	One-shot for checking remote node, checking the worker script, and starting the worker script if ok.
Host.initCommand = "stty -echo\nunset HISTFILE\nnode -e \"" +
	"f=require('fs'),c=require('crypto'),p=process.env.HOME+'/.pony2/',h=" + JSON.stringify( Host.workerHashes ).replace( /"/g, "'" ) + ",u=[],s=process.stdout,j=JSON.stringify;" +
	"for(n in h){" +
		"t=p+n+'.js';" +
		"if(! f.existsSync(t)||c.createHash('md5').update(f.readFileSync(t)).digest('hex')!=h[n])" +
			"u.push(n);" +
	"}" +
	"if(u.length)" +
		"s.write(j({s:'UPDATE_'+'WORKER',f:u}));" +
	"else " +
		"require(p+'worker.js');" +
"\"||node -e \"console.log('BORK_\"\"NODE')\"||echo 'NO_''NODE';echo '****** PONYEDI''T 2 PROMPT ******'\n";

Host.find = function( user, hostname, createIfMissing ) {
	for ( var i = 0; i < Host.knownHosts.length; i++ ) {
		var host = Host.knownHosts[ i ];
		if ( host.hostname == hostname ) {
			if ( ! user || host.user == user ) {
				return host;
			}
		}
	}
	
	if ( createIfMissing ) {
		host = new Host( user, hostname );
		Host.knownHosts.push( host );
		return host;
	}
}

//	Find the host responsible for handling the specified remote file id (rfid)
Host.findByRfid = function( rfid ) {
	if ( Host.byRfid[ rfid ] )
		return Host.byRfid[ rfid ];
	
	return null;
};

Host.prototype.setPassword = function( password ) {
    this.password = password;
};

Host.prototype.handleJob = function( job ) {
	this.jobQueue.push( job );
	job.host = this;
	
	this.connect();
	this.updateQueue();
};

//	Called any time the job queue is updated, to find tunnels for each job.
Host.prototype.updateQueue = function() {
	if ( this.allJobTunnels.length == 0 || this.boundJobTunnels.length == 0 )
		return;
	
	while ( this.jobQueue.length > 0 ) {
		var job = this.jobQueue.shift();
		
		//	Is this job bound to an rfid? Does that rfid already have a tunnel?
		var rfid = job.args.r;
		if ( rfid && this.tunnelBindings[ rfid ] )
			return this.tunnelBindings[ rfid ].takeJob( job );
		
		//	Find the tunnel with the shortest queue among the ones this job is allowed to take
		var tunnelList = rfid ? this.boundJobTunnels : this.allJobTunnels;
		var tunnel = this.findShortestTunnelQueue( tunnelList );
		tunnel.takeJob( job );
		
		//	If this is a bindable job that is not yet bound to a tunnel, bind it now.
		if ( rfid ) {
			this.tunnelBindings[ rfid ] = tunnel;
			Host.byRfid[ rfid ] = this;
		}
	}
}

//	Given an array of WorkerTunnels, find the one with the shortest queue.
Host.prototype.findShortestTunnelQueue = function( tunnelList ) {
	if ( tunnelList.length == 0 )
		return null;
	
	var shortest = tunnelList[0];
	var shortestLength = tunnelList[0].getQueueLength();

	for ( var i = 1; i < tunnelList.length; i++ ) {
		var length = tunnelList[ i ].getQueueLength();
		if ( length < shortestLength ) {
			shortestLength = length;
			shortest = tunnelList[ i ];
		}
	}
	
	return shortest;
}

Host.prototype.setState = function( state, message ) {
	this.status = state;
	this.message = message;
}

Host.prototype.disconnect = function() {
    if ( this.shellStream ) {
        this.shellStream.end();
        this.shellStream = null;
    }
    
    for ( var i = 0; i < this.allJobTunnels.length; i++ ) {
        this.allJobTunnels[ i ].close();
    }
    this.allJobTunnels = [];
    this.boundJobTunnels = [];
    
    if ( this.connection != null ) {
        this.connection.end();
        this.connection = null;
    }
    
    if ( this.childProcess ) {
        this.childProcess.stdin.end();
        this.childProcess.stdin = null;
        
        this.childProcess.stdout.end();
        this.childProcess.stdout = null;
        
        this.childProcess.end();
        this.childProcess = null;
    }
    
    this.status = Host.state.idle;
};

Host.prototype.connect = function() {
	if ( this.status == Host.state.connected || this.status == Host.state.connecting )
		return;
		
	this.status = Host.state.connecting;
	
    if ( this.isLocal )
		this.startLocalWorker();
    else {
        //  Connect via SSH.
        this.connection = new Connection();
        this.connection.on( 'ready', this.onConnectionReady.bind( this ) );
        this.connection.on( 'error', this.onConnectionError.bind( this ) );

        var connectionSettings = {
            host: this.hostname,
            port: this.port,
            username: this.user,
            agent: process.env.SSH_AUTH_SOCK,
            password: this.password,
        }
        
        this.connection.connect( connectionSettings );
    }
}

Host.prototype.startLocalWorker = function() {
    var workerPath = path.join( process.env.HOME, '.pony2' );
    
    //  Make sure the ~/.pony2 path exists.
    try {
        var pathExists = fs.existsSync( workerPath );
        if ( ! pathExists ) {
            fs.mkdirSync( workerPath );
        }
    } catch( e ) {
        this.onConnectionError( new Error( 'Failed to create directory at ' + workerPath ) );
    }
    
    //  Drop the plugin files into the right spot. Don't bother hashing like remote files; just writing a fistful of small files should be really fast anyway.
    for ( var scriptName in Host.workerScripts ) {
        var scriptPath = path.join( workerPath, scriptName + '.js' );
        fs.writeFileSync( scriptPath, Host.workerScripts[ scriptName ] );
    }
    
    //  Prepare a stdout handler to watch for a header...
    this.stdoutHandler = this.getPromptReader( this.parseWorkerHeader.bind( this ) );
    
    //  Launch them in a child process
    this.childProcess = ChildProcess.spawn( 'node', [ path.join( workerPath, 'worker.js' ) ], {
        stdio: [ 'ignore', 'pipe', 'pipe' ]
    } );
    this.childProcess.stdout.on( 'data', this.onStdOut.bind( this ) );
    this.childProcess.stderr.on( 'data', this.onStdErr.bind( this ) );
}

//  Creates a stdout processing callback that reads until the ponyedit prompt is seen, then calls the given callback.
//  Used while running remote shell commands and looking for the pony header after launching a child proc.
Host.prototype.getPromptReader = function( callback ) {
    var resultSent = false;
    var allData = '';
    
	setTimeout( function() {
		if ( resultSent )
			return;
		
		resultSent = true;
		callback( false );
	}, 10000 ).unref();
    
    return function( data ) {
		if ( resultSent )
			return;
        
		allData += data.toString();
		if ( allData.indexOf( Host.shellPrompt ) > -1 ) {
			resultSent = true;
            callback( allData );
		}
	}
}

Host.prototype.onConnectionReady = function() {
	//	Start a shell
    console.log( 'Launching remote shell' );
	this.connection.shell( '/bin/sh', function( err, stream ) {
        console.log( 'Remote shell launched.' );
		if ( err )
			return this.onConnectionError( err );

		this.shellStream = stream;

		//	Hook up some callback on shell events
		stream.on( 'close', this.onShellClose.bind( this ) );
		stream.on( 'data', this.onStdOut.bind( this ) );
		stream.stderr.on( 'data', this.onStdErr.bind( this ) );
		
		//	Try to launch the remote worker.
		this.launchWorker();
	}.bind( this ) );
}

Host.prototype.launchWorker = function( inRetry ) {
	var host = this;
	
    if ( ! global.silent )
	   console.log( 'Checking and launching remote worker' );
    
	this.runShellCommand( Host.initCommand, function( result ) {
		if ( ! result )
			return host.onConnectionError( new Error( 'Timeout while setting up remote prompt!' ) );

		var resultRegExp = new RegExp( '((?:OK|NO|BORK|UPDATE)_(?:WORKER|NODE))([0-9.]*)' );
		var resultMessage = resultRegExp.exec( result );
		if ( ! resultMessage )
			return host.onConnectionError( new Error( 'Unable to interpret response from server:\n' + result ) );
		
		var message = resultMessage[1];
		
		if ( 'NO_NODE' == message )
			return host.onConnectionError( new Error( 'No Node.js found on the remote server' ) );
		
		if ( 'BORK_NODE' == message ) {
			return host.onConnectionError( new Error( 'Node.js returned some errors:\n' + result.substring( 0, result.indexOf( 'BORK_NODE' ) ) ) );
		}
		
		if ( 'UPDATE_WORKER' == message ) {
			if ( inRetry ) {
				//	Already tried updating the worker and it didn't work.
				return host.onConnectionError( new Error( 'Tried to update the remote worker script, but something went wrong.' ) );
			}

			console.log( 'Uploading worker script...' );

			var matches = /{[^{]+UPDATE_WORKER[^}]+}/.exec( result );
			var details = JSON.parse( matches[0] );
			var filesToUpdate = details.f;
			
			var writes = {};
			for ( var i in filesToUpdate ) {
				var key = filesToUpdate[ i ];
				writes[ key ] = new Buffer( Host.workerScripts[ key ] ).toString( 'base64' );
			}
			
			var uploadScript = 
				"var d=" + JSON.stringify( writes ).replace( /"/g, "'" ) + ",p=process.env['HOME']+'/.pony2/',f=require('fs');" +
				"for(i in d)" +
					"f.writeFileSync(p+i+'.js',new Buffer(d[i],'base64'));";
			var uploadCmd = 'mkdir -p ~/.pony2;node -e "' + uploadScript + '" && echo "UPLOAD_OK";echo "****** PONYEDI""T 2 PROMPT ******"\n';
			host.runShellCommand( uploadCmd, function( result ) {
				if ( result.indexOf( 'UPLOAD_OK' ) == -1 )
					return host.onConnectionError( new Error( 'Failed to upload remote worker script, node uploader failed to execute: ' + result ) );

				//	Try launching the worker again
				host.launchWorker( true );
			} );
			
			return;
		}

		if ( 'OK_WORKER' == message ) {
			//	Worker is running! Parse its header and finalize the connection.
			host.parseWorkerHeader( result );
			return;
		}
		
		return host.onConnectionError( new Error( 'Invalid response code sent: "' + message + '"' ) );
	} );
}

//	Called when the worker is successfully running. Parses its output header and finalizes the connection.
Host.prototype.parseWorkerHeader = function( rawHeader ) {
	//	Shave off everything up to "*** HEAD ***"
	var headMarker = '*** HEAD ***';
	var headMarkerPos = rawHeader.indexOf( headMarker );
	if ( headMarkerPos === -1 )
		return this.onConnectionError( new Error( 'Invalid worker script header!' ) );
	rawHeader = rawHeader.substr( headMarkerPos + headMarker.length );

	//	Shave off the pony prompt
	var promptPos = rawHeader.indexOf( Host.shellPrompt );
	if ( promptPos > -1 )
		rawHeader = rawHeader.substr( 0, promptPos );

	//	Parse it as json
	try {
		var header = JSON.parse( rawHeader );
	} catch ( err ) {
		return host.onConnectionError( new Error( 'Invalid worker script header: could not parse:\n' + rawHeader ) );
	}
	
	//	Check the header looks valid
	if ( header.state != 'OK_WORKER' || ! header.port || ! header.clientKey || header.clientKey.length < 20 )
		return host.onConnectionError( new Error( 'Invalid worker script header fields!' ) );
	
	this.workerSettings = header;

	// We're live! 
	this.stdoutHandler = function( data ) {
		process.stdout.write( data.toString() );
	}
	console.log( 'Worker ready; opening worker connections' );	
	
	//	Open 6 tunnels; 1 of which is reserved for unbound jobs, the rest can take both bound and unbound jobs.
	for ( var i = 0; i < 6; i++ ) {
		var tunnel = new WorkerTunnel( this );
		this.allJobTunnels.push( tunnel );
		if ( i > 0 ) this.boundJobTunnels.push( tunnel );
	}
	        
    this.emit( 'connected' );
    
	this.updateQueue();
}

Host.prototype.runShellCommand = function( command, callback ) {
	var allData = '';
	var resultSent = false;

	this.stdoutHandler = this.getPromptReader( callback );
	this.shellStream.write( command );	
}

Host.prototype.onConnectionError = function( error ) {
    if ( this.status == Host.state.idle )
        return;
    
    if ( ! global.silent ) {
        console.log( 'Connection error. womp womp.' );
        console.log( error );
    }
	
    this.emit( 'error', error );
}

Host.prototype.onShellClose = function() {
	this.onConnectionError( new Error( 'Booo! Shell closed! ' ) );
}

Host.prototype.onStdOut = function( data ) {
	if ( this.stdoutHandler ) {
		this.stdoutHandler( data );
	}
}

Host.prototype.onStdErr = function( data ) {
	console.log( data.toString() );
}

module.exports = Host;
