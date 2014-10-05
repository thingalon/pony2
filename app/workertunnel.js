//
//	WorkerTunnel; represents one open ssh tunnel to the remote worker, which handles jobs.
//

var Tools = require( './common/tools.js' );
var Binary = require( './binary.js' );

function WorkerTunnel( host ) {
	this.host = host;
	this.queue = [];
	this.busy = true;
	this.readBuffer = null;
	var tunnel = this;
	
	host.connection.forwardOut( '127.0.0.1', host.workerSettings.port, '127.0.0.1', host.workerSettings.port, function( error, stream ) {
		if ( error )
			return host.onConnectionError( 'Failed to open a worker tunnel:' + error.toString() );
		
		tunnel.stream = stream;		
		
		stream.on( 'close', function() { host.onConnectionError( 'Worker tunnel caved in unexpectedly' ); } );
		stream.on( 'data', Tools.cb( tunnel, tunnel.onData ) )
		stream.on( 'error', function( error ) {
			console.log( 'error: ' + error.toString() );
		} );
		
		//	Send the client key.
		stream.write( new Buffer( host.workerSettings.clientKey ) );
		tunnel.busy = false;
		
		tunnel.updateQueue();
	} );
}

//	Called whenever the queue changes state, to check if we can send anything down the wire.
WorkerTunnel.prototype.updateQueue = function() {
	if ( this.busy )
		return;

	if ( this.queue.length == 0 )
		return;
	
	//	Encode the job for sending.
	var job = this.queue.shift();
	var blob = job.encode();
	
	//	Prepare a packet header
	var header = new Buffer( 5 );
	header[0] = 'p'.charCodeAt( 0 );
	header.writeUInt32BE( blob.length, 1 );
	
	//	Send the header and the job
	this.stream.write( header );
	this.stream.write( blob );
}

//	Receive data from the remote host.
WorkerTunnel.prototype.onData = function( data ) {
	if ( this.readBuffer == null )
		this.readBuffer = data;
	else
		this.readBuffer = Buffer.concat( [ this.readBuffer, data ] );

	if ( this.readBuffer.length < 5 )
		return;

	if ( this.readBuffer[0] != 112 )
		return host.onConnectionError( "There's junk in a worker tunnel" );
	
	var length = this.readBuffer.readUInt32BE( 1 );			

	if ( this.readBuffer.length >= length + 5 ) {
		//	We have a complete packet! 
		var message = Binary.decode( this.readBuffer, 5 );
		console.log( message );
		this.readBuffer = null;
	}	
}

WorkerTunnel.prototype.getQueueLength = function() {
	return this.queue.length;
}

WorkerTunnel.prototype.takeJob = function( job ) {
	console.log( 'Tunnel taking job' );
	this.queue.push( job );
	this.updateQueue();
}

module.exports = WorkerTunnel;
