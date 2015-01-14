//
//	Represents a standard acejs-driven syntax highlighting editor (usually wrapped in a fileview)
//

var Editor = React.createClass( {

	componentDidMount: function() {
		this.ace = ace.edit( this.getDOMNode() );
	    this.ace.setTheme( 'ace/theme/twilight' );
	    this.ace.getSession().setValue( this.props.file.content );
	    
	    if ( this.props.file.type && this.props.file.type.syntax )
			this.ace.getSession().setMode( 'ace/mode/' + this.props.file.type.syntax );
	},

	render: function() {
		return (
			<div className="ace">
			</div>
		);
	},
	
} );
