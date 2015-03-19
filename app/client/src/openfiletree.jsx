//
//	OpenFileTree - a tree in the left bar showing currently open files
//

var OpenFileTree = React.createClass( {

    fileTree: {},
    
    componentDidMount: function() {
        this.updateFileTree();
    },
    
    componentWillUpdate: function() {
        this.updateFileTree();
    },
    
    updateFileTree: function() {
        this.fileTree = {};
    
        for ( var i = 0; i < this.props.openFiles.length; i++ ) {
            var file = this.props.openFiles[ i ];
            var pathPieces = Tools.splitPath( file.path );
            
            var host = pathPieces.host || '( Local Files )';
            var folder = Tools.folderName( pathPieces.path );
            var filename = Tools.filename( pathPieces.path );
            
            if ( ! this.fileTree[ host ] )
                this.fileTree[ host ] = {};
            
            if ( ! this.fileTree[ host ][ folder ] )
                this.fileTree[ host ][ folder ] = {};
            
            this.fileTree[ host ][ folder ][ filename ] = file;
        }
    },
    
    onFileClick: function( path ) {
        App.ui.showFile( path );
    },
    
	renderFile: function( filename, file ) {
        var selectedClass = ( file.path == this.props.currentFile ? 'selected' : '' );
    
		return (
			<li key={ filename } className={ "file " + selectedClass } onClick={ this.onFileClick.bind( this, file.path ) } data-path={ file.path }>
				{ filename }
			</li>
		);
	},
	
	renderFolder: function( folder, files ) {
		return (
			<li key={ folder } className="path">
				<span>{ folder }</span>
				<ul>
					{ Tools.sortObject( Tools.mapObject( files, this.renderFile ) ) }
				</ul>
			</li>
		);
	},
	
	renderHost: function( host, folders ) {
		return (
			<li key={ host } className="host">
				<span>{ host }</span>
				<ul>
					{ Tools.sortObject( Tools.mapObject( folders, this.renderFolder ) ) }
				</ul>
			</li>
		);
	},

	renderHosts: function() {
        return Tools.sortObject( Tools.mapObject( this.fileTree, this.renderHost ) );
	},

    render: function() {
        return (
            <div className="open-file-list">
				<ul className="open-files">
                    { this.renderHosts() }
				</ul>
            </div>
        );
    },

} );
