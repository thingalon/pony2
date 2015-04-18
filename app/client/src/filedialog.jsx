//
//	FileDialog; dialog for selecting files to open or specifying paths to save.
//

var FileDialog = React.createClass( {
	getInitialState: function() {
        var path = null;
        if ( this.props.defaultPath != null )
            path = this.props.defaultPath;
        else if ( FileDialog.lastPath )
            path = FileDialog.lastPath;
        else
            path = Settings.get( 'homeDirectory' );
        
		return {
			path: path,
			pathInputValue: path,
            search: '',
		};
	},
	
	onPathKeyDown: function( event ) {
        if( event.which == 13 ) {   //  Enter on path field.
	    	this.setState( { path: this.state.pathInputValue } );
            event.stopPropagation();
        }
	},
    
    onKeyDown: function( event ) {
        var chord = Tools.findKeyChord( event );
        
        //  Enter / cmd+down
        if ( 13 == event.keyCode || 'go_in' == chord ) {
            this.onAccept();
        }
        
        //  cmd+up
        if ( 'go_out' == chord ) {
            this.onLevelUpClick();
        }
    },
	
	onPathInputChange: function( event ) {
		this.setState( {
			pathInputValue: event.target.value,
		} );
	},
    
    onSearchInputChange: function( event ) {
        this.setState( {
            search: event.target.value,
        } );
    },
	
	setPath: function( path ) {
        if ( path == this.state.path )
            return;
        
        this.setState( {
			path: path,
			pathInputValue: path,
            search: '',
		} );
        
        this.refs.search.getDOMNode().focus();
	},
	
	fullPath: function( filename ) {
		var path = this.state.path;
		if ( ! path.endsWith( '/' ) )
			path += '/';
		return path + filename;
	},
    
    onCancel: function() {
        if ( this.props.onCancel )
            this.props.onCancel();
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
    
    componentDidMount: function() {
        this.getDOMNode().showModal();
        this.refs.search.getDOMNode().focus();
    },
    
	render: function() {
        FileDialog.lastPath = this.state.path;
    
		return (
			<dialog className="dialog file-dialog" tabIndex="0" onKeyDown={ this.onKeyDown }>
				<span className="title">
					Open File
				</span>
				<div className="content">
					<div className="top-bar">
                        <input
                            className="path"
                            type="text"
                            value={ this.state.pathInputValue }
                            onChange={ this.onPathInputChange }
                            onKeyDown={ this.onPathKeyDown }
                            ref="pathBox"
                        />
						<button className="up fa fa-level-up" title="Parent Directory" tabIndex="-1" onClick={ this.onLevelUpClick }></button>
						<button className="refresh fa fa-refresh" title="Refresh" tabIndex="-1" onClick={ this.onRefreshClick }></button>
					</div>
					<div className="columns">
						<div className="folders">
							<ul>
								<li><FavoritePathsList currentPath={ this.state.path } onClickFave={ this.setPath } /></li>
							</ul>
						</div>
						<div className="files">
                            <div className="search-bar">
                                <input
                                    className="search"
                                    ref="search"
                                    value={ this.state.search }
                                    placeholder="Search" 
                                    onChange={ this.onSearchInputChange }
                                />
                            </div>
							<FileTable path={ this.state.path } onChoose={ this.onAccept } search={ this.state.search } ref="filetable" />
						</div>
					</div>
                    
					<div className="button-bar">
                        <button className="cancel" onClick={ this.onCancel }>Cancel</button>
						<button className="ok" onClick={ this.onAccept }>OK</button>
					</div>
				</div>
			</dialog>
		);
	}
} );