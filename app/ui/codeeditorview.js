//
//	CodeEditorView - one code editor bound to one file for editing. Later, more views should exist (eg; hexeditor, etc)
//

function CodeEditorView( file, domParent ) {
	this.file = file;
	this.createDOM( domParent );
	
	this.aceId = 'ace-' + CodeEditorView.nextAceId++;
	
	this.file.onStateChange( Tools.cb( this, this.onFileStateChange ) );
	this.onFileStateChange();
}

CodeEditorView.nextAceId = 1;

CodeEditorView.prototype.createDOM = function( parent ) {
	this.wrap = $( '<div>' ).addClass( 'view-wrap' );
	parent.append( this.wrap );
}

CodeEditorView.prototype.onFileStateChange = function() {
	switch ( this.file.state ) {
		case RemoteFile.State.opening: 
			this.showLoading();
			break;
		
		case RemoteFile.State.open:
			this.showEditor();
			break;		
		
		default:
			this.wrap.empty();
			break;
	}
}

CodeEditorView.prototype.showLoading = function() {
	this.wrap.empty();	
	Tools.loadTemplate( this.wrap, 'view-loader' );
}

CodeEditorView.prototype.showEditor = function() {
	var editor = $( '<div id="' + this.aceId + '">' ).addClass( 'editor' );

	this.wrap.empty();
	this.wrap.append( editor );
	
	this.editor = ace.edit( this.aceId );
	this.editor.getSession().setValue( this.file.content );
	this.editor.setTheme( 'ace/theme/twilight' );

	if ( this.file.type && this.file.type.syntax ) {
		var mode = 'ace/mode/' + this.file.type.syntax;
		this.editor.getSession().setMode( mode );
	}
	
	this.editor.getSession().on( 'change', Tools.cb( this.file, this.file.contentChanged ) );
}
