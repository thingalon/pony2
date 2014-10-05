//
//	Tools to transform JSON objects into binary blobs for transmissions, and vice-versa.
//

var Binary = {};
var chunkSize = 512;

Binary.encode = function( data ) {
	var wb = {
		buffer: new Buffer( chunkSize ),
		cursor: 0,
	};

	_bin_encode( wb, data );
	
	//	This might be slightly mean to buffers.
	wb.buffer.length = wb.cursor;
	return wb.buffer;
}

Binary.decode = function( buffer, offset ) {
	var wb = {
		buffer: buffer,
		cursor: offset || 0,
	};
	
	return _bin_decode( wb );
}

module.exports = Binary;

//
//	Internal decoding methods
//

function _bin_decode( wb ) {
	var type = _dec_byte( wb );
	switch ( type ) {
		case 'h':	//	Hash (JS object)
			var length = _dec_uintx( wb );
			var result = {};
			for ( var i = 0; i < length; i++ ) {
				var key = _bin_decode( wb );
				var value = _bin_decode( wb );
				result[ key ] = value;
			}
			return result;
		
		case 's':	//	String
			var length = _dec_uintx( wb );
			var content = wb.buffer.toString( 'utf8', wb.cursor, wb.cursor + length );
			wb.cursor += length;
			return content;
		
		case 'a':	//	Array
			var length = _dec_uintx( wb );
			var result = [];
			for ( var i = 0; i < length; i++ )
				result.push( _bin_decode( wb ) );
			return result;
		
		case 't':	//	Tiny int
			return _dec_uint8( wb );
		
		case 'n':	//	null
			return null;
		
		case 'i':	//	int32
			return _dec_int32( wb );
		
		default:
			console.log( 'WARNING: Unrecognized type ' + type + ' (' + type.charCodeAt( 0 ) + ') at ' + ( wb.cursor - 1 ) + ' / ' + wb.buffer.length );
			return null;
	}
}

function _dec_byte( wb ) {
	return String.fromCharCode( _dec_uint8( wb ) );
}

function _dec_uint8( wb ) {
	return wb.buffer[ wb.cursor++ ];
}

function _dec_int32( wb ) {
	var value = wb.buffer.readInt32BE( wb.length );
	wb.cursor += 4;
	return value;
}

function _dec_uintx( wb ) {
	var length = _dec_uint8( wb );

	if ( length == 255 ) {
		length = wb.buffer.readUint32BE( wb.cursor );
		wb.cursor += 4;
	}
	
	return length;
}

//
//	Internal encoding methods
//

function _bin_encode( wb, data ) {
	switch ( typeof data ) {
		case 'object':	
			if ( data == null ) {
				//	null
				_enc_byte( wb, 'n' );
			} else if ( data instanceof Array ) {
				//	Array
				_enc_byte( wb, 'a' );
				_enc_uintx( wb, data.length );
				for ( var i = 0; i < data.length; i++ )
					_bin_encode( wb, data[ i ] );
			} else {
				//	Object (hash)
				_enc_byte( wb, 'h' );
				var count = 0;
				for ( var k in data ) count++;
				_enc_uintx( wb, count );
				for ( var k in data ) {
					_bin_encode( wb, k.toString() );
					_bin_encode( wb, data[ k ] );
				}
			}
			break;
		
		case 'boolean':
			_enc_byte( wb, 't' );
			_enc_uint8( wb, data ? 1 : 0 );
			break;
		
		case 'number':
			if ( data >= 0 && data < 256 ) {
				_enc_byte( wb, 't' );
				_enc_uint8( wb, data );
			} else {
				_enc_byte( wb, 'i' );
				_enc_int32( wb, data );
			}
			break;
		
		case 'string':
			buffer = new Buffer( data );
			if ( buffer.length == 1 ) {
				_enc_byte( wb, 'c' );
				_enc_uint8( wb, buffer[0] );
			} else {
				_enc_byte( wb, 's' );
				_enc_uintx( wb, buffer.length );
				_enc_buffer( wb, buffer );
			}
			break;

		default:
			console.log( 'Warning: tried to _bin_encode a ' + ( typeof data ) );
			break;
	}
}

function _ensure_buffer( wb, size ) {
	if ( wb.cursor + size >= wb.buffer.length ) {
		var biggerBuffer = new Buffer( wb.buffer.length + size + chunkSize );
		wb.buffer.copy( biggerBuffer );
		wb.buffer = biggerBuffer;
	}
}

function _enc_byte( wb, value ) {
	_enc_uint8( wb, value.charCodeAt( 0 ) );
}

function _enc_uint8( wb, value ) {
	_ensure_buffer( wb, 1 );
	wb.buffer.writeUInt8( value, wb.cursor );
	wb.cursor++;
}

function _enc_int32( wb, value ) {
	_ensure_buffer( wb, 4 );
	wb.buffer.writeInt32BE( value, wb.cursor );
	wb.cursor += 4;
}

function _enc_uintx( wb, value ) {
	if ( value < 255 ) {
		_enc_uint8( wb, value );
	} else {
		_enc_uint8( wb, 255 );

		_ensure_buffer( wb, 4 );
		wb.buffer.writeUint32BE( value, wb.cursor );
		wb.cursor += 4;
	}
}

function _enc_buffer( wb, value ) {
	_ensure_buffer( wb, value.length );
	value.copy( wb.buffer, wb.cursor );
	wb.cursor += value.length;
}
