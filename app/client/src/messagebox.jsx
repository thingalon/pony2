//
//	MessageBox; dialog that pops up with information.
//

var MessageBox = React.createClass( {
    accept: function() {
        if ( this.props.onAccept )
            this.props.onAccept();
    },

	render: function() {
		return (
			<dialog className={ 'dialog message-box ' + this.props.style }>
				<span className="title">
                    { this.props.title }
				</span>
				<div className="content">
					<div className="body">
                        { this.props.body }
                    </div>
                    
                    <div className="button-bar">
						<button className="ok" onClick={ this.accept }>OK</button>
					</div>
				</div>
			</dialog>
		);
	}
} );