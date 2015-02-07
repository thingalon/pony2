var fs = require( 'fs' );
var crypto = require( 'crypto' );

function FileBuffer( path ) {
    this.path = path;
}

FileBuffer.prototype.open = function( success, failure ) {
    var fb = this;
    
    fs.readFile( this.path, 'utf8', function( err, data ) {
        if ( err )
            return failure( err );
        
        fb.content = data;
        fb.dosEncoded = ( data.indexOf( '\r\n' ) > -1 );
        success();
    } );
};

FileBuffer.prototype.getContent = function() {
    return this.content;
};

FileBuffer.prototype.getChecksum = function() {
    return crypto.createHash( 'md5' ).update( this.content ).digest( 'hex' );
};

FileBuffer.prototype.isDosEncoded = function() {
    return this.dosEncoded;
};

module.exports = FileBuffer;
