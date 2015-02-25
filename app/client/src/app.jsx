//
//	App - global state, main object that handles top level stuff.
//

( function( App ) {
    var files = {};

	App.initialize = function() {
		//	Setup Main Menu
		App.mainMenu = Menu.buildFromTemplate( mainMenuTemplate );
		Menu.setApplicationMenu( App.mainMenu );
		
		//	Setup the left bar
		App.leftBar = React.render(
			<LeftBar />,
			document.getElementById( 'left-bar-mount' )
		);
		App.openFileTree = App.leftBar.refs.openFileTree;

		//	Setup View Stack
		App.viewStack = React.render(
			<ViewStack />,
			document.getElementById( 'view-stack-mount' )
		);
	};

	App.showOpenDialog = function() {
		React.render(
			<div className="overlay">
				<FileDialog onAccept={ App.onOpenDialogResult } />
			</div>,
			document.getElementById( 'overlay-layer' )	
		);
	};
	
	App.onOpenDialogResult = function( filenames ) {
		React.unmountComponentAtNode( document.getElementById( 'overlay-layer' ) );
	
		for ( var i = 0; i < filenames.length; i++ )
			App.showFile( filenames[ i ] );
	};
	
	App.showFile = function( filename, viewType ) {
        //  If no viewType has been specificed, guess one.
        if ( ! viewType ) {
            //  TODO.
        }
        
        //  If no viewType has been found, fall back to 'text' by default.
        viewType = viewType || 'text';
        
        //  Open a view (if not already open)
        App.viewStack.show( filename, viewType );
	};
    
    App.getFileByName = function( filename ) {
        return files[ filename ];
    };
    
    App.save = function() {
        var currentView = App.viewStack.getCurrentView();
        if ( currentView && currentView.save )
            currentView.save();
    };

} )( window.App = window.App || {} );
