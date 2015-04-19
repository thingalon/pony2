( function( Keyboard ) {

    var keys = {
        enter: 13,
        escape: 27,
        
        up: 38,
        down: 40,
        
        a: 65,
    };
    for ( var i in keys )
        Keyboard[ 'key_' + i ] = keys[ i ];
    
    //  Find common key chords and describe what they mean. Useful to make things cross-platform later.
    Keyboard.findKeyChord = function( keyEvent ) {  
        return findMacKeyChord( keyEvent );
    };
    
    //  Output a keypress to the console.
    Keyboard.logKeyPress = function( keyEvent ) {
        var description = '';
        var modifiers = [ 'ctrlKey', 'altKey', 'metaKey', 'shiftKey' ];
        for ( var i = 0; i < modifiers.length; i++ ) {
            if ( keyEvent[ modifiers[ i ] ] )  {
                description += modifiers[ i ] + ' ';
            }
        }
        description += keyEvent.keyCode;
        console.log( description );
    };


    
    function findMacKeyChord( keyEvent ) {
        //  cmd+up
        if ( keyEvent.metaKey && keyEvent.keyCode == 38 ) {
            return 'go_out';
        }
        
        //  cmd+down
        if ( keyEvent.metaKey && keyEvent.keyCode == 40 ) {
            return 'go_in';
        }
        
        //  cmd+a
        if ( keyEvent.metaKey && keyEvent.keyCode == 65 ) {
            return 'select_all';
        }
    };
    
    

} )( window.Keyboard = window.Keyboard || {} );