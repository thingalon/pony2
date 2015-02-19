//  FileTypeManager - manages known filetypes and how to handle them.
( function( FileTypeManager ) {

    var viewTypes = {};
    var fileTypes = {};
    var typePatterns = [];

    FileTypeManager.registerViewType = function( id, details ) {
        viewTypes[ id ] = details;
    };
    
    FileTypeManager.registerFileType = function( id, details ) {
        fileTypes[ id ] = details;
    };
    
    FileTypeManager.getHandlerClass = function( handlerId ) {
        return fileHandlers[ handlerId ];
    };
    
    FileTypeManager.getComponentClassForViewType = function( viewTypeId ) {
        var viewType = viewTypes[ viewTypeId ];
        if ( ! viewType )
            return null;
        
        return viewType.componentClass;
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
