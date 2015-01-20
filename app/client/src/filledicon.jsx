//
//	A stack of font-awesome icons, which allows a filled icon with an outline
//

var FilledIcon = React.createClass( {

	render: function() {
        var fillIcon = this.props.icon;
        if ( this.props.icon.startsWith( 'fa-file' ) )
            fillIcon = 'fa-file';
    
		var fillClass = 'fa fa-stack-1x ' + fillIcon;
		var outlineClass = 'fa fa-stack-1x ' + this.props.icon + ( this.props.color ? '-o' : '' );
		
		var decoration = '';
		if ( this.props.decoration )
			decoration = <i className={ 'fa fa-stack-1x ' + this.props.decoration } style={ { color: '#777', fontSize: '75%', textAlign: 'right' } } />;
		
		var fill = '';
		if ( this.props.color )
			fill = <i className={ fillClass } style={ { color: this.props.color } } />;

		return (
			<span className="fa-stack">
				{ fill }
				<i className={ outlineClass } style={ { color: 'black' } } />
				{ decoration }
			</span>
		);
	}

} );
