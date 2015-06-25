// "use strict";

var GlydeRT = {
		canvas: null,
		glue: {},

		init: function() { "use strict";
			Glue.init( GlydeRT.glue );
			window.addEventListener( "load", GlydeRT.start );

			return true;
		},
			
		start: function() { "use strict";
		  Glyde.startApp();
    },

	  runApp: function( s_appfile ) {
			GlydeRT.canvas = document.getElementById( "content" );
			GlydeRT.canvas.addEventListener( "click", GlydeRT._clickHandler, false );

			VecText.init();
			ExtGlyde.init( GlydeRT.canvas );
			
			Glue.attachPlugin( GlydeRT.glue, ExtGlyde );
			
      // reset the title of the runtime toolbar
			var tb_title = _.e( "tb_title" );
		  tb_title.removeChild( tb_title.childNodes[0] );
		  _.at( tb_title, "Glyde" );
	    var app = Glyde.App.create( s_appfile );
	    if( app ) {
  	    var script_file = Glyde.App.getScriptFile( app );
  	    var main_script = GlueFileManager.readText( script_file );
  	    if( main_script ) {
  	      var vars = Glyde.App.getVarsMap( app );   // already an object/map so no need to convert
  	    
  	      //  TODO: "includes" need to be parsed and added to the start/end of the script
  				Glue.load( GlydeRT.glue, main_script, vars );
  				GlydeRT._showRuntime();
  				Glue.run( GlydeRT.glue );
  	    } else {
  	      // TODO: warn of unable to load script
  	    }
	    } else {
	      // TODO: warn of unable to load app
	    }
	  },

  getRuntimeDiv: function() {
    return _.e( "runtimeview" );
  },
  
  _showRuntime: function() {
    _.se( "loadview", { "display": "none" } );
    _.se( "runtimeview", { "display": "block" } );
  },

  /** Event handling **/
	_clickHandler: function( e ) { "use strict";
		e = (e || window.event);
		
		var label = GlydeRT._getIdAtEventPoint( e );

    if( label ) {
      Glue.run( GlydeRT.glue, label );
    }				
	},
	
  _getIdAtEventPoint: function( o_evt ) { "use strict";
		var rect = GlydeRT.canvas.getBoundingClientRect();
		var x = Math.round( ((o_evt.clientX - rect.left) / (rect.right - rect.left) * GlydeRT.canvas.width) );
		var y = Math.round( ((o_evt.clientY - rect.top) / (rect.bottom - rect.top ) * GlydeRT.canvas.height) );
		return ExtGlyde.getLabelForButtonAt( x, y );
  },
  
  _minimiseWindow: function() {
    chrome.app.window.current().minimize();
  },
  
  _closeWindow: function() {
    chrome.app.window.current().close();
  }
};

// Setup Core, Glue and the file system.  Attaches Glyde.start() to window.onload
// At this point ExtGlyde is NOT available - becomes available after start()
GlydeRT.init();


