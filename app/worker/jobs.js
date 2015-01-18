var Jobs = {};
var fs = require( 'fs' );

//
//	ls - fetch a list of files.
//

Jobs.ls = function( message, success, failure ) {
	var path = expandPath( message.a.path );
	var myUid = process.getuid();
	var myGid = process.getgid();

	//	Read directory.
	fs.readdir( path, function( err, files ) {
		if ( err )
			return failure( message, err.errno, 'Failed to read ' + path );
		
		//	Go through and stat each entry, work out some basic details.
		var filesToDo = files.length;
		var fileDetails = {};
		for ( var i = 0; i < files.length; i++ ) {
			( function( file ) {
				if ( file.substr( 0, 1 ) == '.' ) {
					filesToDo--;
					return;
				}
			
				var fullPath = path + '/' + file;
				fs.lstat( fullPath, function statDone( err, stats ) {
					filesToDo--;
					
					var size = 0;
					var flags = '';
					var target = null;
					var lastModified = null;
					
					//	Follow symlinks
					if ( stats && stats.isSymbolicLink() ) {
						flags += 'l';
						try {
							target = fs.readlinkSync( fullPath );
							stats = fs.statSync( fullPath );
						} catch ( e ) {
							stats = null;
						}
						
						if ( ! stats )
							flags += 'b';
					}
					
					if ( stats ) {
						size = stats.size;
						lastModified = stats.mtime.getTime();
						
						if ( stats.isDirectory() )
							flags += 'd';
						
						//	Guess if this file is readable
						if (
							( ( stats.mode & 0400 ) && ( myUid == stats.uid ) ) ||
							( ( stats.mode & 0040 ) && ( myGid == stats.gid ) ) ||
							( ( stats.mode & 0004 ) )
						) {
							flags += 'r';
						}
						
						//	Guess if this file is writable
						if (
							( ( stats.mode & 0200 ) && ( myUid == stats.uid ) ) ||
							( ( stats.mode & 0020 ) && ( myGid == stats.gid ) ) ||
							( ( stats.mode & 0002 ) ) 
						) {
							flags += 'w';
						}
					}
					
					fileDetails[ file ] = { s: size, f: flags, m: lastModified };
					if ( target )
						fileDetails[ file ].t = target;

					//	Check if that was the last call to stat...
					if ( filesToDo <= 0 )
						success( message, fileDetails );
				} );
			} )( files[ i ] );
		}
	} );
};

module.exports = Jobs;

function expandPath( path ) {
	//	Expand ~
	var home = process.env.HOME;
	if ( ! /\/$/.test( home ) )
		home += '/';
	path = path.replace( /^\/?~(\/|$)/, home );
	
	return path;
}


/*
sub job_open {
	my ( $args ) = @_;
	my $path = expand_path( $args->{'path'} );
	
	print $path . "\n";	
	
	my $buffer = Buffer->new();
	my $error = $buffer->open_file( $path );
	return $error if ( ref( $error ) );
	
	return { 'content' => $buffer->get_encoded(), 'dos' => $buffer->{'dos'}, 'checksum' => $buffer->get_checksum() };
}

sub job_update {
	my ( $args ) = @_;
	my $buffer = Buffer->get( $args->{'rfid'} );
	return { 'error' => 'Buffer not found', 'code' => 'critical' } if ( ! $buffer );
	
	return $buffer->update( $args->{'details'}->{'data'} );
}

sub job_save {
	my ( $args ) = @_;
	my $buffer = Buffer->get( $args->{'rfid'} );
	return { 'error' => 'Buffer not found', 'code' => 'critical' } if ( ! $buffer );

	my $checksum = $args->{'c'};	
	return $buffer->save( $checksum );
}

#
#	Buffer class
#

{ package Buffer;
	use Encode qw(encode decode);
	use Digest::MD5 qw(md5_hex);

	sub new {
		my ( $fid ) = @_;
		
		my $self = { 'fid' => $fid };
		bless $self;
		
		$buffers{ $fid } = $self;
		return $self;
	}
	
	sub get {
		my ( $fid ) = @_;
		return $buffers{ $fid };
	}
	
	sub fid {
		my ( $self ) = @_;
		return $self->{'id'};
	}

	sub open_file {
		my ( $self, $filename ) = @_;
		$self->{'filename'} = $filename;
		
		# Open the file
		if ( ! open( F, '<', $filename ) ) {
			return { 'error' => 'File not found', 'code' => 'not_found' } if ( ! -e $filename );
			return { 'error' => 'Permission denied', 'code' => 'permission' };
		}

		# Read it as bytes
		my $raw_content;		
		do {
			local $/;
			$raw_content = <F>;
		};
		close F;
		
		# Make sure it's utf-8, or throw an error.
		my $content = eval {
			decode( 'utf8', $raw_content, Encode::FB_CROAK );
		} or return { 'error' => 'File is not UTF-8', 'code' => 'invalid_format' };
		
		# Detect DOS line endings, they'll get stripped.
		$self->{'dos'} = ( $content =~ /\r\n/ );

		# Split the file up into lines.
		my @lines = split( /\r?\n/m, $content );
		$self->{'content'} = \@lines;
		
		$self->updated();
		return undef;
	}
	
	sub update {
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
	}
	
	sub save {
		my ( $self, $expected_checksum ) = @_;

		my $checksum = $self->get_checksum();
		return { 'error' => 'Checksum mismatch! :(', 'code' => 'checksum' } if ( $checksum ne $checksum );

		open( OUTFILE, '>', $self->{'filename'} ) or return { 'error' => 'Failed to open file for writing!', 'code' => 'permission' };
		print OUTFILE $self->get_encoded();
		close OUTFILE;
		
		return {};
	}
	
	sub updated {
		my ( $self ) = @_;
		delete $self->{'checksum'};
		delete $self->{'encoded'};
	}

	sub get_encoded {
		my ( $self ) = @_;
		$self->{'encoded'} = encode( 'utf8', join( "\n", @{$self->{'content'}} ) ) unless ( defined( $self->{'encoded'} ) );
		return $self->{'encoded'};
	}
	
	sub get_checksum {
		my ( $self ) = @_;
		$self->{'checksum'} = md5_hex( $self->get_encoded() ) unless ( defined( $self->{'checksum'} ) );
		return $self->{'checksum'};
	}
}

*/
