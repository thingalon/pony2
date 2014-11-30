//
//	FileTable; shows the contents of a directory as a table. Useful for file dialogs, browsers, etc.
//

var FileTable = React.createClass( {
	getInitialState: function() {
		return {
			loaded: false,
			error: null,
			path: this.props.path,
			selected: {},
			focusedFile: null,
		};
	},
	
	componentDidMount: function() {
		this.load();
	},
	
	componentDidUpdate: function() {
		if ( this.props.path != this.state.path ) {
			this.forceLoad();
		}
	},
	
	forceLoad: function() {
		this.setState( {
			loaded: false,
			error: null,
			path: this.props.path,
			selected: {},
			focusedFile: null,
		} );
		this.load();
	},
	
	load: function() {
		new JobHandle( {
			job: 'ls',
			args: {
				path: this.props.path,
			},
			onSuccess: Tools.cb( this, this.lsSuccess ),
			onFailure: Tools.cb( this, this.lsFailure ),
		} );
	},
	
	lsSuccess: function( job, result ) {
		this.setState( {
			loaded: true,
			entries: result.entries
		} );
	},
	
	lsFailure: function( job, code, message ) {
		this.setState( {
			loaded: true,
			error: message
		} );
	},
	
	sortedFilenames: function() {
		var entries = this.state.entries;
		var rawFilenames = Object.keys( entries );
		rawFilenames.sort( function( a, b ) {
			var aIsDir = ( entries[ a ].f.indexOf( 'd' ) !== -1 );
			var bIsDir = ( entries[ b ].f.indexOf( 'd' ) !== -1 );
			
			if ( aIsDir && ! bIsDir )
				return -1;
			else if ( ! aIsDir && bIsDir )
				return 1;
			else if ( a < b )
				return -1;
			else
				return 1;
		} );
		return rawFilenames;
	},
	
	chooseSelected: function() {
		if ( this.props.onChoose )
			this.props.onChoose( Object.key( this.state.selected ) );
	},
	
	getSelected: function() {
		return Object.keys( this.state.selected );
	},
	
	isDirectory: function( filename ) {
		var entry = this.state.entries[ filename ];
		if ( ! entry )
			return false;
		else
			return ( entry.f.indexOf( 'd' ) !== -1 );
	},
	
	onRowClick: function( event ) {
		var filename = event.currentTarget.getAttribute( 'data-filename' );
		var selected = this.state.selected;		

		//	Detect double-click
		if ( this.last_click ) {
			var time = +new Date();
			if ( time - this.last_click.time < 500 && filename == this.last_click.filename ) {
				//	Double-click detected
				if ( this.props.onChoose )
					this.props.onChoose();
				return;
			}
		}
		this.last_click = { time: +new Date(), filename: filename };
		
		//	Work out what's getting selected
		var newSelection = [];
		if ( event.shiftKey ) {
			var sortedFilenames = this.sortedFilenames();
			var lastIndex = sortedFilenames.indexOf( this.state.focusedFile );
			if ( lastIndex < 0 )
				lastIndex = 0;
			
			var thisIndex = sortedFilenames.indexOf( filename );
			if ( thisIndex < 0 )
				return;
				
			newSelection = sortedFilenames.slice( Math.min( lastIndex, thisIndex ), Math.max( lastIndex, thisIndex ) + 1 );
		} else {
			newSelection = [ filename ];
		}
		
		//	Toggle or set?
		if ( event.ctrlKey | event.metaKey ) {
			for ( var i = 0; i < newSelection.length; i++ ) {
				if ( selected[ newSelection[ i ] ] )
					delete selected[ newSelection[ i ] ];
				else
					selected[ newSelection[ i ] ] = 1;
			}
		} else {
			selected = {};
			for ( var i = 0; i < newSelection.length; i++ )
				selected[ newSelection[ i ] ] = 1;
		}
		
		//	Apply.
		this.setState( {
			selected: selected,
			focusedFile: filename,
		} );
	},
	
	renderFile: function( filename, index ) {
		var entry = this.state.entries[ filename ];
		var isDir = ( entry.f.indexOf( 'd' ) !== -1 );
		
		var className = ( index % 2 == 0 ? 'first' : 'second' ) + ( this.state.selected[ filename ] ? ' selected' : '' );
		var icon = ( isDir ? 'fa-folder' : 'fa-file' );
		var iconColor = ( isDir ? '#f90' : '#fff' );
		
		var table = this;
		
		return (
			<tr key={ filename } className={ className } onClick={ this.onRowClick } data-filename={ filename }>
				<td><FilledIcon icon={ icon } color={ iconColor } /> { filename }</td>
				<td>{ isDir ? '' : Tools.prettySize( entry.s ) }</td>
				<td>{ entry.m > 0 ? new Date( entry.m ).toLocaleString()  : '' }</td>
			</tr>
		);
	},

	render: function() {
		if ( this.state.error !== null ) {
			return (
				<StatusArea type="error" icon="fa-warning">
					Error: { this.state.error }
				</StatusArea>
			);
		} else if ( ! this.state.loaded ) {
			return (
				<StatusArea type="loading" icon="fa-cloud-download">
					Loading...
				</StatusArea>
			);
		} else {
			//	Grind up the files list into rows
			var rows = [];
			var filenames = this.sortedFilenames();
			for ( var i = 0; i < filenames.length; i++ )
				rows.push( this.renderFile( filenames[ i ], i ) );
			
			return (
				<table className="files">
					<tr className="head">
						<th>Filename</th>
						<th>Size</th>
						<th>Last Modified</th>
					</tr>
					{ rows }
				</table>
			);
		}
	}
} );