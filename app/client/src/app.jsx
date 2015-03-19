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

	App.showOpenDialog = function() {
        var overlayKey = this.ui.openOverlay( <FileDialog onAccept={ function( filenames ) {
            this.ui.closeOverlay( overlayKey );
            
            for ( var i = 0; i < filenames.length; i++ )
                this.ui.showFile( filenames[ i ] );
        }.bind( this ) } /> );
	};
    
    App.save = function() {
        var currentView = App.viewStack.getCurrentView();
        if ( currentView && currentView.save )
            currentView.save();
    };
    
} )( window.App = window.App || {} );
