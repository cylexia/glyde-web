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
		  // since we're doing our own widgets we need to make them work
		  var idx = 0, w;
		  while( (w = _.e( ("widget_close" + idx) )) ) {
        w.addEventListener( "click", GlydeRT._closeWindow, false );
	      _.e( ("widget_minimise" + idx) ).addEventListener( "click", GlydeRT._minimiseWindow, false );
        idx++;
      }
		  // we need the config, load it and pass on to next method
		  // TODO: a "loading" box?
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = GlydeRT.startWithConfig;
      xhr.open( "GET", chrome.runtime.getURL( "config.dat" ), true );
      xhr.send();
    },
  
  	startWithConfig: function() {
      // "this" will be the request
      if( this.readyState == 4 ) {    // OK
        if( this.status == 200 ) {
          var config = Utils.loadSimpleConfig( this.responseText );
          var app = document.location.hash.substr( 1 );
          var download = [], i;
          var scripts = Utils.split( Dict.valueOf( config, "script" ), "\n" );
          for( i = 0; i < scripts.length; i++ ) {
            download.push( ("script=" + scripts[i] + ";") );
          }
          download.push( ("text=" + app + ".app;") );
          var files = Utils.split( Dict.valueOf( config, app ), "\n" );
          for( i = 0; i < files.length; i++ ) {
            download.push( (files[i] + ";") );
          }
          // load the file list and pass control to the next stage
          FS.init( "/fs/" );
          FS.loadFileSystemFromString( download.join( "\n" ), GlydeRT.startWithFileSystem );
        } else {
          // TODO: show an error page
        }
      }
  	},
		
    startWithFileSystem: function() {
			GlydeRT.canvas = document.getElementById( "content" );
			GlydeRT.canvas.addEventListener( "click", GlydeRT._clickHandler, false );

			VecText.init();
			ExtGlyde.init( GlydeRT.canvas );
			
			Glue.attachPlugin( GlydeRT.glue, ExtGlyde );
			
			GlydeRT.runApp( (document.location.hash.substr( 1 ) + ".app") );
			//var b = document.createElement( "button" );
			//b.appendChild( document.createTextNode( "start" ) );
			//b.addEventListener( "click", GlydeRT.runApp0 );
			//document.getElementsByTagName( "body" )[0].appendChild( b );
		},

    runApp0: function() {
      GlydeRT.runApp( (document.location.hash.substr( 1 ) + ".app") );
    },

	  runApp: function( s_appfile ) {
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


