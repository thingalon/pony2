//
//	OpenFileTree - a tree in the left bar showing currently open files
//

var OpenFileTree = React.createClass( {

	getInitialState: function() {
		return {
			tree: [],
		};
	},
	
	createFileTree: function( files ) {
        var filenames = Object.keys( files ).sort();
        var tree = [];
        var currentHostNode = null;
        var currentHostName = '';
        var currentPathNode = null;
        var currentPathName = '';
        
        for ( var i = 0; i < filenames; i++ ) {
            var file = files[ filename ];
            var path = file.path;
            var pathPieces = Tools.splitPath( path );
            
            //  Determine hostname, create a new branch if need be.
            var hostname = pathPieces.host || 'Local Files';
            if ( hostname != currentHostName ) {
                currentHostName = hostname;
                currentHostNode = {
                    label: currentHostName,
                    paths: [],
                };
                tree.push( currentHostNode );
            }
            
            //  Split out the filename and path
            var lastSlach = pathPieces.path.lastIndexOf( '/' );
            if ( lastSlash < 1 || lastSlash >= pathPieces.path.length - 1 ) {
                var filename = pathPieces.path;
                var path = '/';
            } else {
                var filename = pathPieces.path.substr( lastSlash + 1 );
                var path = pathPieces.path.substr( 0, lastSlash );
            }
            
            //  See if we need a new branch for the path
            if ( currentPathName != path ) {
                currentPathName = path;
                currentPathNode = {
                    label: path,
                    files: [],
                };
                currentHost.paths.push( currentPath );
            }
            
            //  Add a leaf to the tree
            currentPath.files.push( {
                label: filename,
                path: fullPath,
            } );
        }

        return tree;
	},
	
	updateFiles: function( files ) {
		this.setState( {
			tree: this.createFileTree( files ),
		} )
	},
	
	onFileClick: function( event ) {
		var path = event.currentTarget.getAttribute( 'data-path' );
		App.openFile( path );
	},
	
	renderFile: function( file ) {
		return (
			<li key={ file.path } className="file" onClick={ this.onFileClick } data-path={ file.path }>
				{ file.label }
			</li>
		);
	},
	
	renderPath: function( path ) {
		var tree = this;
		return (
			<li key="path.label" className="path">
				<span>{ path.label }</span>
				<ul>
					{ path.files.map( function( f ) {
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
					{ host.paths.map( function( p ) {
						return tree.renderPath( p );
					} ) }
				</ul>
			</li>
		);
	},

	renderHosts: function() {
		var tree = this;
		return this.state.tree.map( function( h ) {
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
	}

} );
