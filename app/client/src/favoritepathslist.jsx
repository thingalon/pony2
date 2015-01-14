//
//	Favorite Paths List; a list of the user's favorite paths, with an option to inline edit the current location if one has been specified.
//

var FavoritePathsList = React.createClass( {

	getInitialState: function() {
		return {
			faves: Settings.get( 'favorites', [] ),
		};
	},
	
	onClickFave: function( index ) {
		var fave = this.state.faves[ index ];
		if ( fave && this.props.onClickFave )
			this.props.onClickFave( fave.path );
	},
	
	saveFaves: function() {
		//	Clean up faves for saves; remove any w/o names or paths.
		var cleanFaves = this.state.faves
			.filter( function( f ) { return !! ( f.name && f.path ); } )
			.map( function( f ) { return { name: f.name, path: f.path }; } );
		
		Settings.set( 'favorites', cleanFaves );
	},
	
	onChangeFaveName: function( index, newName ) {
		var fave = this.state.faves[ index ];
		if ( ! fave )
			return;
		
		fave.name = newName;	
		this.setState( {
			faves: this.state.faves
		} );
		
		this.saveFaves();
	},
	
	onDeleteFave: function( index ) {
		this.state.faves.splice( index, 1 );
		this.setState( {
			faves: this.state.faves
		} );
		this.saveFaves();
	},
	
	onAddClick: function() {
		this.state.faves.push( {
			name: Tools.describePath( this.props.currentPath ),
			path: this.props.currentPath,
			isNew: true,
		} );
		
		this.setState( {
			faves: this.state.faves,
		} );

		this.saveFaves();
	},
	
	render: function() {
		var addButton = '';
		if ( this.props.hasOwnProperty( 'currentPath' ) ) {
			addButton = ( 
				<li className="add-favorite" onClick={ this.onAddClick }>
					<i className="fa fa-plus-circle" /> Add Favorite
				</li> 
			);
		}

		var list = this;
		var faves = this.state.faves.map( function( fave, index ) {
			return ( <FavoritePathsList.Favorite 
				key={ 'fave-' + index }
				index={ index }
				name={ fave.name }
				path={ fave.path }
				onClick={ list.onClickFave }
				onNameChange={ list.onChangeFaveName }
				onDelete={ list.onDeleteFave } 
				edit={ fave.isNew } />
			);
		} );
		
		return (
			<span>
				<span className="head">Favorite Locations</span>
				<ul className="favorites">
					{ faves }
					{ addButton }
				</ul>
			</span>
		);
	}
	
} );

FavoritePathsList.Favorite = React.createClass( {
	
	getInitialState: function() {
		return {
			editing: this.props.edit,
		};
	},
	
	onClick: function() {
		if ( this.props.onClick )
			this.props.onClick( this.props.index );
	},
	
	onEditClick: function() {
		this.setState( {
			editing: ! this.state.editing,
		} );
	},
	
	onNameChange: function( event ) {
		if ( this.props.onNameChange ) {
			this.props.onNameChange( this.props.index, event.target.value );
		}
	},

	onNameKeyDown: function( event ) {
	    if( event.which == 13 )
	    	this.stopEditing();
	},
	
	stopEditing: function() {
		this.setState( { editing: false } );
	},
	
	onDeleteClick: function() {
		this.stopEditing();
		if ( this.props.onDelete )
			this.props.onDelete( this.props.index );
	},
	
	render: function() {
		if ( this.state.editing ) {
			return (
				<li className="favorite editing" onClick={ this.onClick } >
					<input 
						value={ this.props.name }
						onChange={ this.onNameChange }
						onKeyDown={ this.onNameKeyDown }
						autoFocus="true" />
					
					<div className="button-bar">
						<button className="delete" onClick={ this.onDeleteClick }>Delete</button>
						<button className="done" onClick={ this.stopEditing }>Done</button>
					</div>
				</li>
			);
		} else {
			return (
				<li className="favorite" onClick={ this.onClick } >
					<a className="edit" onClick={ this.onEditClick }><i className="fa fa-edit" /></a>
					{ this.props.name }
				</li>
			);
		}
	},
	
} );





