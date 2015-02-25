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
    
    process.stdout.write( "****\n" );
    process.stdout.write( this.content );
    process.stdout.write( "****\n" );
    
	/*sub update {
		my ( $self, $details ) = @_;
		my $action = $details->{'action'};
		my $start = $details->{'range'}->{'start'};
		my $end = $details->{'range'}->{'end'};
		
		# Ensure start always comes before end for simplicity.
		if ( $end->{'row'} < $start->{'row'} || ( $end->{'row'} == $start->{'row'} && $end->{'column'} < $start->{'column'} ) ) {
			( $start, $end ) = ( $end, $start );
		}
		
		my $cursor_row = $start->{'row'};
		my $cursor_col = $start->{'column'};
		
		if ( 'insertText' eq $action ) {
			my @insert_lines = split( "\n", $details->{'text'}, -1 );
			my $first_line = shift( @insert_lines );

			if ( scalar( @insert_lines ) == 0 ) {
				# Quick insert in one line.
				substr( $self->{'content'}->[ $cursor_row ], $cursor_col, 0 ) = $first_line;
			} else {
				# Multi-line insert.
				$insert_lines[ -1 ] .= substr( $self->{'content'}->[ $cursor_row ], $cursor_col );
				$self->{'content'}->[ $cursor_row ] = substr( $self->{'content'}->[ $cursor_row ], 0, $cursor_col ) . $first_line;
				splice @{ $self->{'content'} }, $cursor_row + 1, 0, @insert_lines;
			}
		} elsif ( 'removeText' eq $action ) {
			my $row_count = $end->{'row'} - $start->{'row'} + 1;
			
			if ( $row_count == 1 ) {
				# Remove within one line
				my $length = $end->{'column'} - $start->{'column'};
				substr( $self->{'content'}->[ $cursor_row ], $start->{'column'}, $length ) = '';
			} elsif ( $row_count == 2 ) {
				# Multi-line removal
				substr( $self->{'content'}->[ $start->{'row'} ], $start->{'column'} ) = substr( $self->{'content'}->[ $end->{'row'} ], $end->{'cplumn'} );
				splice @{ $self->{'content'} }, $cursor_row + 1, $row_count - 1;
			} else {
				return { 'error' => "removeText called across ${row_count} lines. Not supported.", 'code' => 'not_implemented' };
			}
		} elsif ( 'removeLines' eq $action ) {
			my $row_count = $end->{'row'} - $start->{'row'};
			splice @{ $self->{'content'} }, $cursor_row, $row_count;
		} else {
			return { 'error' => "Unknown update action: ${action}.", 'code' => 'not_implemented' };
		}
		
		$self->updated();
		return {};
	}*/
};

module.exports = FileBuffer;
