//
//	Host - represents a remote ssh host. Use Host.get to find host objects.
//

var Connection = require( 'ssh2' );
var crypto = require( 'crypto' );
var fs = require( 'fs' );
var ipc = require( 'ipc' );

var Tools = require( './common/tools.js' );
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
Host.state = {
	idle: 0,
	connecting: 1,
	connected: 2,
};
Host.shellPrompt = '****** PONYEDIT 2 PROMPT ******';

//	At app start-time, load worker.pl and calculate its hash.
Host.workerScript = fs.readFileSync( __dirname + '/assets/worker.pl' );
Host.workerScriptHash = crypto.createHash( 'md5' ).update( Host.workerScript, 'utf8' ).digest( 'hex' );

//	One-liner for checking perl, checking the worker script, and starting the worker script if ok.
Host.initCommand = "stty -echo\nunset HISTFILE\nperl -e '" +
	'sub x{print$_[0]."\\n";exit;}' +	//	sub x = print string and exit.
	'x"OLD_"."PERL$]"if($]<5.01);' +	//	Check perl version
	'use Digest::file qw(digest_file_hex);' +
	'$f=$ENV{"HOME"}."/.pony2/worker.pl";' + 
	'x"NO_"."WORKER"if(!-e$f);' +	//	Check worker exists
	'x"OLD_"."WORKER"if(digest_file_hex($f,"MD5")ne"' + Host.workerScriptHash + '");' +	//	Check worker md5 hash
	'exec "perl $f"' +	//	Run worker
"'||perl -e 'print \"BORK_''PERL\";'||echo 'NO_''PERL';echo '****** PONYEDI''T 2 PROMPT ******'\n";	//	Output error if no perl found

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
			this.tunnelBindings[ job.args.rfid ].takeJob( job );
		
		//	Find the tunnel with the shortest queue among the ones this job is allowed to take
		var tunnelList = bindableJob ? this.boundJobTunnels : this.allJobTunnels;
		var tunnel = this.findShortestTunnelQueue( tunnelList );
		tunnel.takeJob( job );
		
		//	If this is a bindable job that is not yet bound to a tunnel, bind it now.
		if ( bindableJob )
			this.tunnelBindings[ job.args.rfid ] = tunnel;
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

		var resultRegExp = new RegExp( '((?:OK|NO|OLD|BORK)_(?:WORKER|PERL))([0-9.]*)' );
		var resultMessage = resultRegExp.exec( result );
		if ( ! resultMessage )
			return host.onConnectionError( 'Unable to interpret response from server!' );
		
		var message = resultMessage[1];
		
		if ( 'NO_PERL' == message )
			return host.onConnectionError( 'No Perl found on the remote server!' );
		
		if ( 'BORK_PERL' == message ) {
			return host.onConnectionError( 'Perl returned some errors:\n' + result.substring( 0, result.indexOf( 'BORK_PERL' ) ) );
		}
		
		if ( 'OLD_PERL' == message ) {
			var version = resultMessage[2];
			var versionRegExp = new RegExp( '([0-9]+).([0-9]{3})' );
			var prettyVersion = versionRegExp ? versionRegExp[1] + '.' + (versionRegExp[2] - 0) : 'unknown';
			return host.onConnectionError( 'The remote server is running an old version of Perl (' + prettyVersion + '). Please upgrade to at least 5.10' );
		}
		
		if ( 'NO_WORKER' == message || 'OLD_WORKER' == message ) {
			if ( inRetry ) {
				//	Already tried updating the worker and it didn't work.
				return host.onConnectionError( 'Tried to update the remote worker script, but something went wrong.' );
			}

			console.log( 'Uploading worker script...' );

			//	Need to update the worker and try again.
			var encodedWorker = new Buffer( Host.workerScript ).toString( 'base64' );
			var upload = 'mkdir -p ~/.pony2; echo "' + encodedWorker + '" | perl -MMIME::Base64 -e \'print decode_base64(join("", <>))\' > ~/.pony2/worker.pl; echo "' + Host.shellPrompt + '"\n';
			host.runShellCommand( upload, function( result ) {
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
	var headMarker = rawHeader.indexOf( '*** HEAD ***' );
	if ( headMarker === -1 )
		return host.onConnectionError( 'Invalid worker script header!' );
	
	//	Parse the header (key:value format. Why isn't it JSON? Because Perl doesn't support it in core)
	var header = {};
	rawHeader = rawHeader.substr( headMarker );
	var lines = rawHeader.split( '\n' );
	for ( var i = 0; i < lines.length; i++ ) {
		var pieces = lines[ i ].split( ':', 2 );
		if ( pieces.length != 2 )
			continue;
		
		header[ pieces[0] ] = pieces[1].trim();
	}
	
	//	Check the header looks valid
	if ( header.state != 'OK_WORKER' || ! header.port || header.cacheKey.length < 100 || header.clientKey.length < 100 )
		return host.onConnectionError( 'Invalid worker script header fields!' );
	
	this.workerSettings = header;

	// We're live! 
	this.stdoutHandler = function( data ) {
		console.log( data.toString() );
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
