//
//	PonyEdit remote worker script. Don't alter me.
//

var fs = require( 'fs' );
var net = require( 'net' );
var crypto = require( 'crypto' );
var Binary = require( './binary' );
var Jobs = require( './jobs' );

//	Create a listening server on a random free port.
var server = net.createServer( handleConnection );
server.listen( 0, '127.0.0.1', function() {
	//	Display server info header.
	server.clientKey = crypto.randomBytes( 32 ).toString( 'hex' );
	process.stdout.write( '*** HEAD ***' + JSON.stringify( {
		state: 'OK_WORKER',
		port: server.address().port,
		clientKey: server.clientKey,
		homeDir: process.env.HOME,
		node: process.version,
	} ) );
	process.stdout.write( '****** PONYEDIT 2 PROMPT ******\n' );
} );

function chopBuffer( buffer, bytes ) {
	if ( buffer.length > bytes ) {
		var choppedBuffer = new Buffer( buffer.length - bytes );
		buffer.copy( choppedBuffer, 0, bytes );
		return choppedBuffer;
	}
	
	return new Buffer( 0 );
}

//	handleConnection - main handler for each incoming connection
function handleConnection( socket ) {
	var buffer = new Buffer( 0 );
	var headerAccepted = false;
	
	//	Handle incoming data.
	socket.on( 'data', function( data ) {
		buffer = Buffer.concat( [ buffer, data ] );
		
		//	Ensure we have seen a valid header. Disconnect if not.
		if ( ! headerAccepted ) {
			if ( buffer.length >= server.clientKey.length ) {
				var header = buffer.slice( 0, server.clientKey.length );
				if ( header.toString( 'ascii' ) == server.clientKey ) {
					//	Header looks ok.
					headerAccepted = true;
					buffer = chopBuffer( buffer, server.clientKey.length );
				} else {
					//	Invalid header supplied
					socket.end();
				}
			}
		}
		
		//	See if we have enough data to parse a message.
		if ( buffer.length > 5 ) {
			if ( buffer[ 0 ] !== 112 ) {
				console.log( 'Invalid data received: expected packet header, got: ' + buffer[ 0 ] );
				console.log( buffer.toString() );
				socket.end();
			}
			
			var packetLength = buffer.readUInt32BE( 1 );
			if ( buffer.length >= packetLength + 5 ) {
				//	We have a packet! 
				var packet = buffer.slice( 5, packetLength + 5 );
				handlePacket( socket, packet );
				buffer = chopBuffer( buffer, packetLength + 5 );
			} else {
				console.log( buffer.length + ' ' + packetLength );
			}
		}
	} );
}

function sendPacket( socket, data ) {
	var blob = Binary.encode( data );
	
	//	Prepare a packet header
	var header = new Buffer( 5 );
	header[0] = 'p'.charCodeAt( 0 );
	header.writeUInt32BE( blob.length, 1 );
	
	//	Send the header and the job
	socket.write( header );
	socket.write( blob );
}

function messageSuccess( message, result ) {
	sendPacket( message.socket, {
		i: message.i,
		r: result,
	} );
}

function messageFailure( message, code, error ) {
	sendPacket( message.socket, {
		i: message.i,
		errcode: code,
		errmessage: error,
	} );
}

function handlePacket( socket, packet ) {
	var message = Binary.decode( packet, 0 );
	message.socket = socket;
	
	var job = message.j;
	if ( ! Jobs[ job ] )
		return messageFailure( message, 'Invalid job: ' + job );
			
	Jobs[ job ]( message, messageSuccess, messageFailure );
}
