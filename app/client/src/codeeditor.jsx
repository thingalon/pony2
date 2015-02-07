var CodeEditor = React.createClass( {
    render: function() {
        return <div>I'm a code editor.</div>;
    },
} );

document.addEventListener( 'DOMContentLoaded', function() {
    FileTypeManager.registerViewType( 'code', {
        name: 'Code',
        icon: 'fa-file-code',
        handler: 'text',
        component: CodeEditor
    } );
    
    FileTypeManager.registerFileType( 'javascript', {
        name: 'JavaScript',
        view: 'code',
        patterns: [ '\.jsx?$' ],
        iconColor: '#fff185',
    } );
    
    FileTypeManager.registerFileType( 'html', {
        name: 'HTML',
        view: 'code',
        patterns: [ '\.html$' ],
        iconColor: '#ff9875',
    } );
    
    FileTypeManager.registerFileType( 'css', {
        name: 'CSS',
        view: 'code',
        patterns: [ '\.css?$' ],
        iconColor: '#70d4ff',
    } );
} );
