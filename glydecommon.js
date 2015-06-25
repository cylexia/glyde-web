var Glyde = {
  // utilties class
  
  _needed_objects: null,
  _checker_interval_id: null,
  
  startApp: function() {
    // we look for a file called "fs.glyde" in this folder to load and parse
    var xhr = new XMLHttpRequest();
console.log( "issuing request for file" );
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
          document.getElementsByTagName( "body" )[0].appendChild( img );
        }
        
		    // and finally, the text files
        for( rows = Utils.split( Dict.valueOf( fs, "text" ), "\n" ), i = 0; i < rows.length; i++ ) {
          var ta = document.createElement( "textarea" );
    		  ta["gluefilesystem.id"] = rows[i];
    		  ta["glyde.complete"] = false;
          document.getElementsByTagName( "body" )[0].appendChild( ta );
		      var xhr = new XMLHttpRequest();
          xhr["glyde.textarea"] = ta;
    			xhr.onreadystatechange = Glyde._setTextAreaFromXHR;
    			xhr.open( "GET", (root + rows[i]), true );
    			xhr.send();
        }
		
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
		console.log( "failed to load text, load will never complete" );
		// TODO: call something to notify of the error
      }
    }
  },
  
  _checkLoaded: function() {
	  // Check to see if text files have loaded
    var tas = document.getElementsByTagName( "textarea" );
    for( var i = 0; i < tas.length; i++ ) {
      if( !tas[i]["glyde.complete"] ) {
        console.log( "textarea " + i + " isn't complete yet" + Math.random() );
        return;
      }
    }
    
   // check if the images are all loaded
    var imgs = document.getElementsByTagName( "img" );
    for( var i = 0; i < imgs.length; i++ ) {
      if( !imgs[i].complete ) {
        console.log( "image " + i + " isn't complete yet" + Math.random() );
        return;
      }
    }

	// check if the exec apps have registered
	var scripts = document.getElementsByTagName( "script" );
	for( var i = 0; i < scripts.length; i++ ) {
		if( scripts["glyde.exec_app_src"] ) {
			if( !GluePlatform.isExecAppAvailable( scripts["glyde.exec_app_src"] ) ) {
				console.log( "exec app " + i + " is not loaded" + Math.random() );
				return false;
			}
		}
	}
    // everythings loaded!
    window.clearInterval( Glyde._checker_interval_id );
    console.log( "we have everything we want" );
  },
  
  
  _loadNextFile: function( a_files ) {
console.log( "_loadNextFile" );
    if( this["glyde.files"] ) {
      a_files = this["glyde.files"];
    }
    if( a_files.length === 0 ) {
console.log( "no more images" );
      return;
      // TODO: call the next function as load is done
    }
    var file = a_files.pop();
    switch( file["type"] ) {
      case "image":
console.log( "image: " + file["source"] + " -> " + file["dest"] );
        item = document.createElement( "img" );
        item["glyde.files"] = a_files;
        item.src = "";
        item.addEventListener( "load", FS._loadNextFile, false );
        item.src = file["source"] + "?" + Math.random();
        //item.style["display"] = "none";
        document.getElementsByTagName( "body" )[0].appendChild( item );
        break;
    }
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
