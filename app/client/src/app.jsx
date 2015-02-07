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
				<FileDialog onAccept={ this.onOpenDialogResult } />
			</div>,
			document.getElementById( 'overlay-layer' )	
		);
	},
	
	onOpenDialogResult: function( filenames ) {
		React.unmountComponentAtNode( document.getElementById( 'overlay-layer' ) );
	
		for ( var i = 0; i < filenames.length; i++ )
			App.openFile( filenames[ i ] );
	},
	
	openFile: function( filename, viewType ) {
        //  If no viewType has been specificed, guess one.
        if ( ! viewType ) {
            //  TODO.
        }
        
        //  If no viewType has been found, fall back to 'code' by default.
        viewType = viewType || 'code';
        
        //  Determine the type of filehandle to use based on the view
        var fileHandler = FileTypeManager.getHandlerForView( viewType );
        
        //  Open a filehandle (if not already open)
        var fileKey = fileHandler + '' + filename;
        if ( ! this.files[ fileKey ] ) {
            var klass = FileTypeManager.getHandlerClass( fileHandler );
            this.files[ fileKey ] = new klass( filename );
            this.files[ fileKey ].open();
            this.openFileTree.updateFiles( this.files );
        }
         
        //  Open a view (if not already open)
        this.viewStack.showFile( this.files[ fileKey ], viewType );
	}
	
};
