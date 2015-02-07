//  FileTypeManager - manages known filetypes and how to handle them.
( function( FileTypeManager ) {

    var fileHandlers = {};
    var viewTypes = {};
    var fileTypes = {};
    var typePatterns = [];

    FileTypeManager.registerFileHandler = function( id, klass ) {
        fileHandlers[ id ] = klass;
    };
    
    FileTypeManager.registerViewType = function( id, details ) {
        viewTypes[ id ] = details;
    };
    
    FileTypeManager.registerFileType = function( id, details ) {
        fileTypes[ id ] = details;
    
        for ( var i = 0; i < details.patterns.length; i++ ) {
            typePatterns.push( {
                pattern: new RegExp( details.patterns[ i ] ),
                type: id,
            } );
        }
    };
    
    FileTypeManager.getHandlerClass = function( handlerId ) {
        return fileHandlers[ handlerId ];
    };
    
    FileTypeManager.getHandlerForView = function( viewId ) {
        var viewType = viewTypes[ viewId ];
        if ( viewType && viewType.handler )
            return viewType.handler;
        
        return null;
    };
    
    FileTypeManager.guessFileType = function( filename ) {
        for ( var i = 0; i < typePatterns.length; i++ ) {
            if ( typePatterns[ i ].pattern.test( filename ) ) {
                return typePatterns[ i ].type;
            }
        }
    };
    
    FileTypeManager._getFileTypeProperty = function( typeId, property, defaultValue ) {
        var fileType = fileTypes[ typeId ];
        if ( fileType ) {
            if ( fileType[ property ] )
                return fileType[ property ];
            
            if ( fileType.view ) {
                var viewType = viewTypes[ fileType.view ];
                if ( viewType && viewType[ property ] )
                    return viewType[ property ];
            }
        }
        
        return defaultValue;
    };
    
    FileTypeManager.getFileTypeIcon = function( typeId ) {
        return this._getFileTypeProperty( typeId, 'icon', 'fa-file' );
    };
    
    FileTypeManager.getFileTypeIconColor = function( typeId ) {
        return this._getFileTypeProperty( typeId, 'iconColor', '#fff' );
    };
    
    FileTypeManager.getFileTypeName = function( typeId ) {
        return this._getFileTypeProperty( typeId, 'name', 'File' );
    };

} )( window.FileTypeManager = window.FileTypeManager || {} );
