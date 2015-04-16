//
//	App - global state, main object that handles top level stuff.
//

( function( App ) {
	
    App.initialize = function() {
		//	Setup Main Menu
		this.mainMenu = Menu.buildFromTemplate( mainMenuTemplate );
		Menu.setApplicationMenu( App.mainMenu );
		
        //  Setup UI
        this.ui = React.render( <UI />, document.body );
	};

    App.save = function() {
        var currentView = this.ui.getCurrentView();
        if ( currentView && currentView.save )
            currentView.save();
    };
    
} )( window.App = window.App || {} );
