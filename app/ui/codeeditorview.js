//
//	CodeEditorView - one code editor bound to one file for editing. Later, more views should exist (eg; hexeditor, etc)
//

function CodeEditorView( file, domParent ) {
	this.file = file;
	this.createDOM( domParent );
	
	this.file.onStateChange( Tools.cb( this, this.onFileStateChange ) );
	this.onFileStateChange();
}

CodeEditorView.prototype.createDOM = function( parent ) {
	this.wrap = $( '<div>' ).addClass( 'view-wrap' );
	parent.append( this.wrap );
}

CodeEditorView.prototype.onFileStateChange = function() {
	console.log( this.file.state );

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
	this.wrap.empty();
	this.wrap.append( $( '<textarea>' ).text( this.file.content ).css( 'width', '100%' ).css( 'height', '100%' ) );
}
