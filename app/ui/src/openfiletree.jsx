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
		var sortedFilenames = Object.keys( files );
		var hosts = [];
		var currentHost = null;
		var currentHostName = '';
		var currentPath = null;
		var currentPathName = '';
		
		for ( var i = 0; i < sortedFilenames.length; i++ ) {
			var fullPath = sortedFilenames[ i ];
			var pathPieces = Tools.splitPath( fullPath );
			
			//	Determine hostname, create a new branch if need be.
			var hostname = pathPieces.host || 'Local Computer';
			if ( hostname != currentHostName ) {
				currentHostName = hostname;
				currentHost = {
					label: currentHostName,
					paths: [],
				};
				currentPath = null;
				currentPathName = '';
				hosts.push( currentHost );
			}
			
			//	Split the path from the filename
			var lastSlash = pathPieces.path.lastIndexOf( '/' );
			if ( lastSlash < 1 || lastSlash >= pathPieces.path.length - 1 ) {
				var filename = pathPieces.path;
				var path = '/';
			} else {
				var filename = pathPieces.path.substr( lastSlash + 1 );
				var path = pathPieces.path.substr( 0, lastSlash );
			}
			
			//	See if we need a new branch for the path
			if ( currentPathName != path ) {
				currentPathName = path;
				currentPath = {
					label: path,
					files: [],
				};
				currentHost.paths.push( currentPath );
			}
			
			//	Add to the tree
			currentPath.files.push( {
				label: filename,
				path: fullPath
			} );
		}
		
		return hosts;
	},
	
	updateFiles: function( files ) {
		this.setState( {
			tree: this.createFileTree( files ),
		} )
	},
	
	renderFile: function( file ) {
		return (
			<li key={ file.path } className="file">
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
