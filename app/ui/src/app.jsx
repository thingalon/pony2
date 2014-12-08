//
//	App - global state, main object that handles top level stuff.
//

var App = {

	files: {},

	initialize: function() {
		//	Setup Main Menu
		this.mainMenu = Menu.buildFromTemplate( mainMenuTemplate );
		Menu.setApplicationMenu( this.mainMenu );
		
		//	Setup the left bar
		this.leftBar = React.render(
			<LeftBar />,
			document.getElementById( 'left-bar-mount' )
		);
		this.openFileTree = this.leftBar.refs.openFileTree;

		//	Setup View Stack
		this.viewStack = React.render(
			<ViewStack />,
			document.getElementById( 'view-stack-mount' )
		);
	},

	showOpenDialog: function() {
		React.render(
			<div className="overlay">
				<FileDialog onAccept={ this.openFiles } />
			</div>,
			document.getElementById( 'overlay-layer' )	
		);
	},
	
	openFiles: function( filenames ) {
		React.unmountComponentAtNode( document.getElementById( 'overlay-layer' ) );
	
		for ( var i = 0; i < filenames.length; i++ )
			App.openFile( filenames[ i ] );
	},
	
	openFile: function( filename ) {
		if ( ! this.files[ filename ] ) {
			this.files[ filename ] = new RemoteFile( filename );
			this.files[ filename ].open();
			this.openFileTree.updateFiles( this.files );
		}
		
		this.viewStack.showFile( this.files[ filename ] );
	}
	
};
