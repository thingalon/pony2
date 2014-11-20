#
# PonyEdit 2 remote worker script. Please don't alter or run me.
#

use strict;
use Scalar::Util qw(looks_like_number);
use IO::Socket::INET;
use Data::Dumper;
use Fcntl qw(:mode);
use Encode qw(decode encode);
use Encode::Guess;
use Digest::MD5 qw(md5_hex);

our %buffers;
our %job_types = (
	'ls'     => \&job_ls,
	'open'   => \&job_open,
	'save'   => \&job_save,
	'update' => \&job_update,
);

$| = 1;	# Autoflush.
main();

sub main {
	my $client_key = generate_key();
	my $listen_socket = create_listen_socket();
	my $listen_port = get_listen_port( $listen_socket );
	my $cache_key = get_cache_key();
	
	print_header( $client_key, $listen_port );
	listen_loop( $client_key, $listen_socket );
}

sub generate_key {
	my @chars = ('A'..'Z', 'a'..'z', '0'..'9');
	my $key = '';
	$key .= $chars[rand @chars] for 1..128;
	return $key;
}

sub create_listen_socket {
	return new IO::Socket::INET(
		LocalHost => 'localhost',
		LocalPort => 0,
		Proto => 'tcp',
		Listen => 5,
		Reuse => 1,
		Blocking => 1,
	) or die "failed to create socket: $!\n";
}

sub get_listen_port {
	return ( sockaddr_in( getsockname( shift @_ ) ) )[0];
}

sub get_cache_key() {
	my $key_file = $ENV{"HOME"} . '/.ponybridge/cache_key';
	my $key;

	if ( -e $key_file && open my $rh, $key_file ) {
		local $/ = undef;
		$key = <$rh>;
		close $rh;
	} else {
		$key = generate_key();	
		open my $wh, '>', $key_file or die "$!";
		print $wh $key;
		close $wh;
	}
	
	return $key;	
}

sub print_header {
	my ( $client_key, $listen_port ) = @_;
	my $cache_key = get_cache_key();

	print "*** HEAD ***\n";
	print "state:OK_WORKER\n";
	print "port:$listen_port\n";
	print "cacheKey:$cache_key\n";
	print "clientKey:$client_key\n";
	print "homeDir:$ENV{HOME}\n";
	print "****** PONYEDIT 2 PROMPT ******\n";
}

sub listen_loop {
	my ( $client_key, $listen_socket ) = @_;
	while ( 1 ) {
		my $client_socket = $listen_socket->accept();
		if ( 0 == fork ) {
			connection_loop( $client_key, $client_socket );
			exit;
		} else {
			$client_socket = undef;
		}
	}
}

sub connection_loop {
	my ( $client_key, $socket ) = @_;

	# Check connection key.	
	die unless read_timeout( $socket, length( $client_key ), 10 ) eq $client_key;
	
	while ( 1 ) {
		my $packet = read_packet( $socket );
		my $message = bin_decode( $packet );
		my $result = undef;
		
		if ( $job_types{ $message->{'job'} } ){
			$result = $job_types{ $message->{'job'} }->( $message->{'args'} );
		} else {
			$result = {
				'error' => 'Unrecognized job type: ' . $message->{'job'},
				'code' => 'internal',
			};
		}
		
		my $response = bin_encode( $result );
		send_packet( $socket, $response );
	}
}

sub read_packet {
	my ( $socket )  = @_;
	my ( $buffer, $raw_head );
	
	log_write("Reading packing header");
	recv $socket, $raw_head, 5, MSG_WAITALL;
	my ( $type, $packet_size ) = unpack( 'CN', $raw_head );	

	choke( $socket, "Protocol error: expected packet header, got $type instead." ) if ( chr( $type ) != 'p' );

	recv $socket, $buffer, $packet_size, MSG_WAITALL;
	return $buffer;
}

sub send_packet {
	my ( $socket, $data ) = @_;
	$socket->send( 'p' . pack( 'N', length( $data ) ) . $data );
}

sub choke {
	my ( $socket, $error ) = @_;
	$socket->send( 'e' . pack( 'N', length( $error ) ) . $error );
	die;
}

sub read_timeout {
	my ( $socket, $wanted_size, $timeout ) = @_;
	my $buffer;
	
	eval {
		local $SIG{ALRM} = sub { die "alarm\n" };
		alarm $timeout;
		recv $socket, $buffer, $wanted_size, MSG_WAITALL;
		alarm 0;
	};
	if ( $@ ) {
		die $@ unless $@ eq "alarm\n";
		return undef;
	}
	
	return $buffer;
}

{
	my $log_file = undef;
	sub log_write {
		my ( $message ) = @_;
		
		if ( ! defined( $log_file ) ) {
			open( $log_file, '>>', $ENV{"HOME"} . '/.ponybridge/log.txt' ) or die ($! );
			my $old_fh = select( OUTPUT_HANDLE );
			$| = 1;
			select( $old_fh );
		}
	
		print $log_file $message . "\n";
	}
}


sub bin_decode {
	my $cursor = 0;
	return _bin_decode( $_[0], \$cursor );
}

sub _dec_uintx {
	my ( $data, $cursor ) = @_;
	my $v = ord( substr( $data, $$cursor, 1 ) );
	$$cursor++;
	return $v if ( $v < 254 );
	$v = unpack( 'N', substr( $data, $$cursor, 4 ) );
	$$cursor += 4;
	return $v;
}

sub _bin_decode {
	my ( $data, $cursor ) = @_;
	
	my $type = substr( $data, $$cursor, 1 );
	$$cursor++;
	
	if ( 'h' eq $type ) {
		my $h = {};
		my $len = _dec_uintx( $data, $cursor );
		for ( my $i = 0; $i < $len; $i++ ) {
			my $k = _bin_decode( $data, $cursor );
			my $v = _bin_decode( $data, $cursor );
			$h->{$k} = $v;
		}
		return $h;
	} elsif ( 's' eq $type ) {
		my $len = _dec_uintx( $data, $cursor );
		my $s = decode( 'utf8', substr( $data, $$cursor, $len ) );
		$$cursor += $len;
		return $s;
	} elsif ( 'i' eq $type ) {
		my $v = unpack( 'l>', substr( $data, $$cursor, 4 ) );
		$$cursor += 4;
		return $v;
	} elsif ( 'a' eq $type ) {
		my $v = [];
		my $len = _dec_uintx( $data, $cursor );
		for ( my $i = 0; $i < $len; $i++ ) {
			push @$v, _bin_decode( $data, $cursor );
		}
		return $v;
	} elsif ( 't' eq $type ) {
		my $v = ord( substr( $data, $$cursor, 1 ) );
		$$cursor++;
		return $v;
	} elsif ( 'c' eq $type ) {
		my $v = substr( $data, $$cursor, 1 );
		$$cursor++;
		return $v;
	}

	choke( "Protocol error: Invalid datatype $type.\n" );
}

sub bin_encode {
	my $encoded = '';
	_bin_encode( $_[0], \$encoded );	
	return $encoded;
}

sub _enc_uintx {
	my ( $data, $enc ) = @_;
	if ( $data < 255 ) {
		$$enc .= chr( $data );
	} else {
		$$enc .= chr( 255 ) . pack( 'N', $data );
	}
}

sub _bin_encode {
	my ( $data, $enc ) = @_;
	
	my $type = ref( $data );
	if ( 'HASH' eq $type ) {
		$$enc .= 'h';
		_enc_uintx( scalar( keys %$data ), $enc );
		while ( my ($k, $v) = each %$data ) {
			_bin_encode( '' . $k, $enc );
			_bin_encode( $v, $enc );
		}
	} elsif ( 'ARRAY' eq $type ) {
		$$enc .= 'a';
		_enc_uintx( scalar( @$data ), $enc );
		foreach my $v ( @$data ) {
			_bin_encode( $v, $enc );
		}
	} elsif ( looks_like_number( $data ) ) {
		if ( $data >= 0 && $data < 256 ) {
			$$enc .= 't';
			$$enc .= chr( $data );
		} else {
			$$enc .= 'i';
			$$enc .= pack( 'l>', $data );
		}
	} else {
		$data = encode( 'utf8', $data );
	 	if ( length( $data ) == 1 ) {
			$$enc .= 'c';
			$$enc .= $data;
		} else {
			$$enc .= 's';
			_enc_uintx( length( $data ), $enc );
			$$enc .= $data;
		}
	}

}

sub expand_path {
	my ( $path ) = @_;
	my $home_dir = $ENV{HOME};
	
	$path =~ s/^\/?~(\/|$)/$home_dir\//;

	return $path;
}

#
#	Jobs
#

sub job_ls {
	my ( $args ) = @_;
	my $include_hidden = $args->{'hidden'};
	my $path = expand_path( $args->{'path'} );
	my $entries = {};
	
	opendir DIR, $path;
	while ( my $filename = readdir DIR ) {
		next if ( ! $include_hidden && $filename =~ /^\./ );
		next if ( $filename eq '.' | $filename eq '..' );
		
		my ( $dev, $ino, $mode, $nlink, $uid, $gid, $rdev, $size,
			$atime, $mtime, $ctime, $blksize, $blocks ) = stat( "$path/$filename" );
		
		my $flags = 
			( S_ISDIR( $mode ) ? 'd' : '' ) .
			( ( -r "$path/$filename" ) ? 'r' : '' ) .
			( ( -w "$path/$filename" ) ? 'w' : '' );
		
		$entries->{ $filename } = { 'f' => $flags, 's' => $size, 'm' => $mtime };
	}
	close DIR;

	return { 'error' => 'Permission denied', 'code' => 'permission' } if ( scalar( keys %$entries ) == 0 && ! ( -r $path ) );
	return { 'entries' => $entries };
}

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

