//  FileTypeManager - manages known filetypes and how to handle them.
( function( FileTypeManager ) {

    var handlers = {};
    var fileTypes = {};
    var filePatterns = [];
    
    FileTypeManager.registerFileHandler = function( details ) {
        if ( ! details.id || ! details.name || ! details.component || handlers[ details.id ] )
            return false;
        
        handlers[ details.id ] = details;
        return true;
    };
    
    FileTypeManager.registerFileType = function( details ) {
        if ( ! details.id || ! details.name || ! details.handler || ! details.patterns )
            return false;
        
        if ( ! handlers[ details.handler ] )
            return false;
        
        fileTypes[ details.id ] = details;
        
        for ( var i = 0; i < details.patterns.length; i++ ) {
            filePatterns.push( {
                regexp: new RegExp( details.patterns[ i ] ),
                fileType: details.id,
            } );
        }
        
        return true;
    };
    
    FileTypeManager.getFileHandlers = function() {
    };
    
    FileTypeManager.guessFileType = function( filename ) {
        for ( var i in filePatterns ) {
            var pattern = filePatterns[ i ];
            if ( pattern.regexp.test( filename ) )
                return pattern.fileType;
        }
        
        return null;
    };
    
    FileTypeManager.getFileType = function( typeId ) {
        return fileTypes[ typeId ];
    };
    
    FileTypeManager.getTypeIcon = function( typeId ) {
        var fileType = fileTypes[ typeId ];
        if ( fileType ) {
            if ( fileType.icon )
                return fileType.icon;
            
            var handler = handlers[ fileType.handler ];
            if ( handler && handler.icon )
                return handler.icon;
        }
        
        return 'fa-file';
    };
    
    FileTypeManager.getTypeIconColor = function( typeId ) {
        var fileType = fileTypes[ typeId ];
        if ( fileType ) {
            if ( fileType.iconColor )
                return fileType.iconColor;
            
            var handler = handlers[ fileType.handler ];
            if ( handler && handler.iconColor )
                return handler.iconColor;
        }
        
        return '#fff';
    };
    
    FileTypeManager.getTypeName = function( typeId ) {
        var fileType = fileTypes[ typeId ];
        if ( fileType ) {
            if ( fileType.name )
                return fileType.name;
            
            var handler = handlers[ fileType.handler ];
            if ( handler && handler.name )
                return handler.name;
        }
        
        return 'File';
    }

} )( window.FileTypeManager = window.FileTypeManager || {} );
