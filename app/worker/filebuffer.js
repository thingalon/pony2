var fs = require( 'fs' );
var crypto = require( 'crypto' );

function FileBuffer( rfid, path ) {
    this.rfid = rfid;
    this.path = path;
    
    FileBuffer.byRfid[ rfid ] = this;
}

FileBuffer.byRfid = {};
FileBuffer.getByRfid = function( rfid ) {
    return FileBuffer.byRfid[ rfid ];
};

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

FileBuffer.prototype.modify = function( details ) {
    if ( details.d )
        this.content = this.content.substr( 0, details.p ) + this.content.substr( details.p + details.d );

    if ( details.t )
        this.content = this.content.substr( 0, details.p ) + details.t + this.content.substr( details.p );

    process.stdout.writeLine( "***" );
    console.log( this.content );
};

FileBuffer.prototype.save = function( checksum, success, failure ) {
    if ( this.getChecksum() != checksum )
        return failure( 'CHECKSUM_MISMATCH', 'The remote FileBuffer has a different checksum :(' );
    
    fs.writeFile( this.path, this.content, function( err ) {
        if ( err )
            return failure( err );
        success();
    } );
};

module.exports = FileBuffer;
