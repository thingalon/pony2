//
//	FileDialog; dialog for selecting files to open or specifying paths to save.
//

var FileDialog = React.createClass( {
	getInitialState: function() {
		var path = Settings.get( 'homeDirectory' );
		return {
			path: path,
			pathInputValue: path,
		};
	},
	
	onPathKeyDown: function( event ) {
	    if( event.which == 13 )
	    	this.setState( { path: this.state.pathInputValue } );
	},
	
	onPathInputChange: function( event ) {
		this.setState( {
			pathInputValue: event.target.value,
		} );
	},
	
	setPath: function( path ) {
		this.setState( {
			path: path,
			pathInputValue: path 
		} );
	},
	
	fullPath: function( filename ) {
		var path = this.state.path;
		if ( ! path.endsWith( '/' ) )
			path += '/';
		return path + filename;
	},
	
	onAccept: function() {
		var fileTable = this.refs.filetable;
		var selected = fileTable.getSelected();
		
		//	If one directory has been selected, open it.
		if ( selected.length == 1 && fileTable.isDirectory( selected[ 0 ] ) ) {
			this.setPath( this.fullPath( selected[ 0 ] ) );
			return;
		}
		
		//	Ignore selected directories
		selected = selected.filter( function( entry ) { return ! fileTable.isDirectory( entry ); } );
		if ( selected.length == 0 )
			return;
			
		//	Convert from just filenames to full paths
		var dialog = this;
		selected = selected.map( function( entry ) { return dialog.fullPath( entry );  } );
		
		//	Success!
		if ( this.props.onAccept )
			this.props.onAccept( selected );
	},
	
	onLevelUpClick: function() {
		this.setPath( Tools.parentPath( this.state.path ) );
	},
	
	onRefreshClick: function() {
		this.refs.filetable.forceLoad();
	},
	
	render: function() {
		return (
			<div className="dialog file-dialog">
				<span className="title">
					Open File
				</span>
				<div className="content">
					<div className="top-bar">
						<input className="path" type="text" value={ this.state.pathInputValue } onChange={ this.onPathInputChange } onKeyDown={ this.onPathKeyDown } />
						<button className="up fa fa-level-up" title="Parent Directory" onClick={ this.onLevelUpClick }></button>
						<button className="refresh fa fa-refresh" title="Refresh" onClick={ this.onRefreshClick }></button>
					</div>
					<div className="columns">
						<div className="folders">
							<ul>
								<li><FavoritePathsList currentPath={ this.state.path } onClickFave={ this.setPath } /></li>
							</ul>
						</div>
						<div className="files">
							<FileTable path={ this.state.path } onChoose={ this.onAccept } ref="filetable" />
						</div>
					</div>
					<div className="button-bar">
						<button className="cancel">Cancel</button>
						<button className="ok" onClick={ this.onAccept }>OK</button>
					</div>
				</div>
			</div>
		);
	}
} );