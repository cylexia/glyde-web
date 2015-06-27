// "use strict";

var Glyde = {
  // utilties class
  
  _checker_interval_id: null,
  _checker_timeout: 0,
  _run_app: "",
  
  startApp: function() {
    // we look for a file called "fs.glyde" in this folder to load and parse
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = Glyde._startWithFS;
    xhr.open( "GET", "fs.glyde", true );
    xhr.send();
  },
  
  _startWithFS: function() {
    // "this" points to the request since that sent the event
    if( this.readyState == 4 ) {    // OK
      if( this.status == 200 ) {
        var fs = Utils.parseSimpleConfig( this.responseText );
        // first, we'll load all the scripts we need for "platform.exec"
        Glyde._run_app = Dict.valueOf( fs, "run" );
        var root = Dict.valueOf( fs, "root", "" );
        var i, item, rows, path_src, path_dest, pi;
        var head = document.getElementsByTagName( "head" )[0];
        for( rows = Utils.split( Dict.valueOf( fs, "script" ), "\n" ), i = 0; i < rows.length; i++ ) {
          item = document.createElement( "script" );
	        item["glyde.exec_app_src"] = rows[i];
          item.src = (root + rows[i]);
          head.appendChild( item );
        }
        
        // next, we'll add the images
        var body = document.getElementsByTagName( "body" );
        for( rows = Utils.split( Dict.valueOf( fs, "image" ), "\n" ), i = 0; i < rows.length; i++ ) {
          var img = document.createElement( "img" );
          if( (pi = rows[i].indexOf( ">" )) > -1 ) {
            path_src = rows[i].substr( 0, pi ).trim();
            path_dest = rows[i].substr( (pi + 1) ).trim();
          } else {
            path_src = path_dest = rows[i];
          }
          if( path_src.indexOf( "://" ) == -1 ) {
            img.src = (root + path_src);
          } else {
            img.src = path_src;
          }
		      img["gluefilesystem.id"] = path_dest;
		      img.style["display"] = "none";
          document.getElementsByTagName( "body" )[0].appendChild( img );
        }
        
		    // and finally, the text files
        for( rows = Utils.split( Dict.valueOf( fs, "text" ), "\n" ), i = 0; i < rows.length; i++ ) {
          if( (pi = rows[i].indexOf( ">" )) > -1 ) {
            path_src = rows[i].substr( 0, pi ).trim();
            path_dest = rows[i].substr( (pi + 1) ).trim();
          } else {
            path_src = path_dest = rows[i];
          }
          var ta = document.createElement( "textarea" );
    		  ta["gluefilesystem.id"] = path_dest;
    		  ta["glyde.complete"] = false;
    		  ta.style["display"] = "none";
          document.getElementsByTagName( "body" )[0].appendChild( ta );
		      var xhr = new XMLHttpRequest();
          xhr["glyde.textarea"] = ta;
    			xhr.onreadystatechange = Glyde._setTextAreaFromXHR;
    			xhr.open( "GET", (root + path_src), true );
    			xhr.send();
        }
console.log( "Waiting for resources..." );
        Glyde._checker_interval_id = window.setInterval( Glyde._checkLoaded, 250 );
      }
    }
  },
  
  _setTextAreaFromXHR: function() {
	// "this" points to the request since that sent the event
    if( this.readyState == 4 ) {    // OK
      if( this.status == 200 ) {
        var ta = this["glyde.textarea"];
		    ta.value = this.responseText;
		    ta["glyde.complete"] = true;
      } else {
        window.clearInterval( Glyde._checker_interval_id );
        window.alert( "Unable to load resource, try refreshing the page?" );
      }
    }
  },
  
  _checkLoaded: function() {
    // have we been going for 10 seconds?
    if( Glyde._checker_timeout++ == 40 ) {
      window.clearInterval( Glyde._checker_interval_id );
      window.alert( "Loading is taking too long, try refreshing the page?" );
    }
	  // Check to see if text files have loaded
	  var i;
    var tas = document.getElementsByTagName( "textarea" );
    for( i = 0; i < tas.length; i++ ) {
      if( !tas[i]["glyde.complete"] ) {
        //console.log( "textarea " + i + " isn't complete yet" + Math.random() );
        return;
      }
    }
    
   // check if the images are all loaded
    var imgs = document.getElementsByTagName( "img" );
    for( i = 0; i < imgs.length; i++ ) {
      if( !imgs[i].complete ) {
        //console.log( "image " + i + " isn't complete yet" + Math.random() );
        return;
      }
    }
  
  	// check if the exec apps have registered
  	var scripts = document.getElementsByTagName( "script" );
  	for( i = 0; i < scripts.length; i++ ) {
  		if( scripts["glyde.exec_app_src"] ) {
  			if( !GluePlatform.isExecAppAvailable( scripts["glyde.exec_app_src"] ) ) {
  				//console.log( "exec app " + i + " is not loaded" + Math.random() );
  				return false;
  			}
  		}
  	}
    // everythings loaded!
    window.clearInterval( Glyde._checker_interval_id );
console.log( "Loaded everything, launching app: " + Glyde._run_app );
    document.getElementById( "loadview" ).style["display"] = "none";
    GlydeRT.runApp( Glyde._run_app );
  },
  
  

  App: {
    create: function( s_file, s_src ) {
      if( !s_src ) {
        s_src = GlueFileManager.readText( s_file );
      }
      if( s_src === null ) {
        return null;
      }
			var e, s = 0;
			var key, value;
			var data = Dict.create(), vars = Dict.create();
			Dict.set( data, "_file", s_file );
			while( (e = s_src.indexOf( ";", s )) > -1 ) {
			  var line = s_src.substr( s, (e - s) ).trim();
			  s = (e + 1);
				e = line.indexOf( "=" );
				if( (e > -1) && (line.length > 0) && (line.charAt( 0 ) != "#") ) {
					key = line.substring( 0, e );
					value = line.substring( (e + 1) );
					if( key == "var" ) {
    				e = value.indexOf( "=" );
    				if( e > -1 ) {
    					Dict.set( vars, value.substring( 0, e ), value.substring( (e + 1) ) );
    				}
					} else {
					  Dict.set( data, key, value );
					}
				}
			}
			Dict.set( data, "var_dict", vars );
      return data;
    },
    
    getFile: function( d_app ) {
      return Dict.valueOf( d_app, "_file" );
    },
  
    getTitle: function( d_app ) {
      return Dict.valueOf( d_app, "title" );
    },
    
    getScriptFile: function( d_app ) {
      return Dict.valueOf( d_app, "script" );
    },
  
    getIconFile: function( d_app ) {
      return Dict.valueOf( d_app, "icon" );
    },
    
    getIncludeFiles: function( d_app ) {      // comma separated list? or multiple include keys makes an array/indexed dict?
      return Dict.valueOf( d_app, "include" );
    },
    
    getVarsMap: function( d_app ) {   // Dict
      return Dict.valueOf( d_app, "var_dict" );
    },
    
    getWindowDict: function( d_app ) {
      return Dict.createFromDictBranch( d_app, "window." );
    }
  }
};

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


