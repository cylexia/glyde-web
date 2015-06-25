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
        var i, item, rows;
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
          if( rows[i].indexOf( "://" ) == -1 ) {
            img.src = (root + rows[i]);
          } else {
            img.src = rows[i];
          }
		      img["gluefilesystem.id"] = rows[i];
		      img.style["display"] = "none";
          document.getElementsByTagName( "body" )[0].appendChild( img );
        }
        
		    // and finally, the text files
        for( rows = Utils.split( Dict.valueOf( fs, "text" ), "\n" ), i = 0; i < rows.length; i++ ) {
          var ta = document.createElement( "textarea" );
    		  ta["gluefilesystem.id"] = rows[i];
    		  ta["glyde.complete"] = false;
    		  ta.style["display"] = "none";
          document.getElementsByTagName( "body" )[0].appendChild( ta );
		      var xhr = new XMLHttpRequest();
          xhr["glyde.textarea"] = ta;
    			xhr.onreadystatechange = Glyde._setTextAreaFromXHR;
    			xhr.open( "GET", (root + rows[i]), true );
    			xhr.send();
        }
		    console.log( "Starting wait" );
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
    console.log( "Launching app: " + Glyde._run_app );
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
