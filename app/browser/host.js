//
//	Host - represents a remote ssh host. Use Host.get to find host objects.
//

var Connection = require( 'ssh2' );
var crypto = require( 'crypto' );
var fs = require( 'fs' );
var ipc = require( 'ipc' );

var Tools = require( '../common/tools.js' );
var WorkerTunnel = require( './workertunnel.js' );

function Host( user, hostname ) {
	this.user = user;
	this.hostname = hostname;

	this.allJobTunnels = [];	//	all 7 tunnels; non-bound jobs can go to the least busy of all
	this.boundJobTunnels = [];	//	5 file-bound tunnels; can take regular jobs, or file-specific ones.
	this.tunnelBindings = {};	//	Maps remote file ids to workertunnels they are bound to

	this.jobQueue = [];
	this.status = Host.state.idle;
}

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
	"f=require('fs'),c=require('crypto'),p=process.env['HOME']+'/.pony2/',h=" + JSON.stringify( Host.workerHashes ).replace( /"/g, "'" ) + ",u=[],s=process.stdout,j=JSON.stringify;" +
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
}

Host.prototype.handleJob = function( job ) {
	this.jobQueue.push( job );
	job.host = this;
	
	this.connect();
	this.updateQueue();
}

//	Called any time the job queue is updated, to find tunnels for each job.
Host.prototype.updateQueue = function() {
	if ( this.allJobTunnels.length == 0 || this.boundJobTunnels.length == 0 )
		return;
	
	while ( this.jobQueue.length > 0 ) {
		var job = this.jobQueue.shift();
		
		//	Is this job bound to an rfid? Does that rfid already have a tunnel?
		var bindableJob = job.args.rfid;
		if ( bindableJob && this.tunnelBindings[ job.args.rfid ] )
			return this.tunnelBindings[ job.args.rfid ].takeJob( job );
		
		//	Find the tunnel with the shortest queue among the ones this job is allowed to take
		var tunnelList = bindableJob ? this.boundJobTunnels : this.allJobTunnels;
		var tunnel = this.findShortestTunnelQueue( tunnelList );
		tunnel.takeJob( job );
		
		//	If this is a bindable job that is not yet bound to a tunnel, bind it now.
		if ( bindableJob ) {
			this.tunnelBindings[ job.args.rfid ] = tunnel;
			Host.byRfid[ job.args.rfid ] = this;
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

Host.prototype.connect = function() {
	if ( this.status == Host.state.connected || this.status == Host.state.connecting )
		return;
		
	this.status = Host.state.connecting;
	
	this.connection = new Connection();
	this.connection.on( 'ready', Tools.cb( this, this.onConnectionReady ) );
	this.connection.on( 'error', Tools.cb( this, this.onConnectionError ) );

	this.connection.connect( {
		host: this.hostname,
		port: 22,
		username: this.user,
		agent: process.env.SSH_AUTH_SOCK,
	} );
}

Host.prototype.onConnectionReady = function() {
	var host = this;

	//	Start a shell
	this.connection.shell( '/bin/sh', function( err, stream ) {
		if ( err )
			return host.onConnectionError( err );

		host.shellStream = stream;

		//	Hook up some callback on shell events
		stream.on( 'close', Tools.cb( host, host.onShellClose ) );
		stream.on( 'data', Tools.cb( host, host.onStdOut ) );
		stream.stderr.on( 'data', Tools.cb( host, host.onStdErr ) );
		
		//	Try to launch the remote worker.
		host.launchWorker();
	} );
}

Host.prototype.launchWorker = function( inRetry ) {
	var host = this;
	
	console.log( 'Checking and launching remote worker' );
	this.runShellCommand( Host.initCommand, function( result ) {
		if ( ! result )
			return host.onConnectionError( 'Timeout while setting up remote prompt!' );

		var resultRegExp = new RegExp( '((?:OK|NO|BORK|UPDATE)_(?:WORKER|NODE))([0-9.]*)' );
		var resultMessage = resultRegExp.exec( result );
		if ( ! resultMessage )
			return host.onConnectionError( 'Unable to interpret response from server:\n' + result );
		
		var message = resultMessage[1];
		
		if ( 'NO_NODE' == message )
			return host.onConnectionError( 'No Node.js found on the remote server!' );
		
		if ( 'BORK_NODE' == message ) {
			return host.onConnectionError( 'Node.js returned some errors:\n' + result.substring( 0, result.indexOf( 'BORK_NODE' ) ) );
		}
		
		if ( 'UPDATE_WORKER' == message ) {
			if ( inRetry ) {
				//	Already tried updating the worker and it didn't work.
				return host.onConnectionError( 'Tried to update the remote worker script, but something went wrong.' );
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
					return host.onConnectionError( 'Failed to upload remote worker script, node uploader failed to execute: ' + result );

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
		
		return host.onConnectionError( 'Invalid response code sent: "' + message + '"' );
	} );
}

//	Called when the worker is successfully running. Parses its output header and finalizes the connection.
Host.prototype.parseWorkerHeader = function( rawHeader ) {
	//	Shave off everything up to "*** HEAD ***"
	var headMarker = '*** HEAD ***';
	var headMarkerPos = rawHeader.indexOf( headMarker );
	if ( headMarkerPos === -1 )
		return this.onConnectionError( 'Invalid worker script header!' );
	rawHeader = rawHeader.substr( headMarkerPos + headMarker.length );

	//	Shave off the pony prompt
	var promptPos = rawHeader.indexOf( Host.shellPrompt );
	if ( promptPos > -1 )
		rawHeader = rawHeader.substr( 0, promptPos );

	//	Parse it as json
	try {
		var header = JSON.parse( rawHeader );
	} catch ( err ) {
		return host.onConnectionError( 'Invalid worker script header: could not parse:\n' + rawHeader );
	}
	
	//	Check the header looks valid
	if ( header.state != 'OK_WORKER' || ! header.port || ! header.clientKey || header.clientKey.length < 20 )
		return host.onConnectionError( 'Invalid worker script header fields!' );
	
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
	
	this.updateQueue();
}

Host.prototype.runShellCommand = function( command, callback ) {
	var allData = '';
	var resultSent = false;

	this.stdoutHandler = function( data ) {
		if ( resultSent )
			return;	
	
		allData += data.toString();
		if ( allData.indexOf( Host.shellPrompt ) > -1 ) {
			callback( allData );
			resultSent = true;
		}
	}
	
	setTimeout( function() {
		if ( resultSent )
			return;
		
		resultSent = true;
		callback( false );
	}, 10000 );
	
	this.shellStream.write( command );	
}

Host.prototype.onConnectionError = function( error ) {
	console.log( 'Connection error. womp womp.' );
	console.log( error );
	//	TODO: actually do something about it.
}

Host.prototype.onShellClose = function() {
	this.onConnectionError( 'Booo! Shell closed! ' );
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
