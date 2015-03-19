//
//	OpenFileTree - a tree in the left bar showing currently open files
//

var OpenFileTree = React.createClass( {

    fileTree: [],
    
    componentDidMount: function() {
        this.updateFileTree();
    },
    
    componentWillUpdate: function() {
        this.updateFileTree();
    },
    
    updateFileTree: function() {
        this.fileTree = [];
        var currentHost = null, currentFolder = null;
    
        for ( var i = 0; i < this.props.openFiles.length; i++ ) {
            var file = this.props.openFiles[ i ];
            var pathPieces = Tools.splitPath( file.path );
            
            var host = pathPieces.host || 'Local Files';
            var folder = Tools.folderName( pathPieces.path );
            var filename = Tools.filename( pathPieces.path );
            
            if ( currentHost == null || currentHost.label != host ) {
                this.fileTree.push( currentHost = {
                    label: host,
                    folders: [],
                } );
                currentFolder = null;
            }
            
            if ( currentFolder == null || currentFolder.label != folder ) {
                currentHost.folders.push( currentFolder = {
                    label: folder,
                    files: [],
                } );
            }
            
            currentFolder.files.push( {
                label: filename,
                path: file.path,
                file: file,
            } );
        }
    },
    
	renderFile: function( file ) {
		return (
			<li key={ file.path } className="file" onClick={ this.onFileClick } data-path={ file.path }>
				{ file.label }
			</li>
		);
	},
	
	renderFolder: function( folder ) {
		var tree = this;
		return (
			<li key="path.label" className="path">
				<span>{ folder.label }</span>
				<ul>
					{ folder.files.map( function( f ) {
						return tree.renderFile( f ); 
					} ) }
				</ul>
			</li>
		);
	},
	
	renderHost: function( host ) {
		var tree = this;
		return (
			<li key="host.label" className="host">
				<span>{ host.label }</span>
				<ul>
					{ host.folders.map( function( p ) {
						return tree.renderFolder( p );
					} ) }
				</ul>
			</li>
		);
	},

	renderHosts: function() {
		var tree = this;
		return this.fileTree.map( function( h ) {
			return tree.renderHost( h );
		} );
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
