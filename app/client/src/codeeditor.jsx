var CodeEditor = React.createClass( {
    render: function() {
        return <div>I'm a code editor.</div>;
    },
} );

document.addEventListener( 'DOMContentLoaded', function() {
    FileTypeManager.registerFileHandler( {
        id: 'code_editor',
        name: 'Code Editor',
        icon: 'fa-file-code',
        component: CodeEditor,
    } );
    
    FileTypeManager.registerFileType( {
        id: 'js',
        name: 'JavaScript File',
        handler: 'code_editor',
        patterns: [ '\.jsx?$' ],
        iconColor: '#fff185',
    } );

    FileTypeManager.registerFileType( {
        id: 'html',
        name: 'HTML File',
        handler: 'code_editor',
        patterns: [ '\.html$' ],
        iconColor: '#ff9875',
    } );
    
    FileTypeManager.registerFileType( {
        id: 'css',
        name: 'CSS File',
        handler: 'code_editor',
        patterns: [ '\.css$' ],
        iconColor: '#70d4ff',
    } );
} );
