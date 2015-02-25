/*

user requests a file (chooses a view either explicitly or implicitly) ->
a view is opened for the file -> 
it's up to the view then to determine how to open the file ->
'text' will then deal with the TextView conduit class to open a TextView conduit ->
The textview conduit is linked to the File object ->
When the user tells the UI to close the file, all linked views and conduits are closed.


--> hover over a file, it tells you "Open as Text, Open As ____" with individual conduit closing options?

every view has to be registered with every conduit they depend on so if the conduit is closed so is the view
every conduit has to be registered with every open file so when the file is closed, all conduits are closed.


!! I think this is the correct model!!

MySQL views are likely to want to create a conduit per view.
But Text views are likely to want to create a conduit per file.

That should be up to the individual view to determine.

*/

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
