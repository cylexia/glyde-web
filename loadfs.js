var FS = {
  _inited: false,
  _files: [],
  _done_callback: null,
  _root: "",
  
  init: function( s_root ) {
    if( !FS._inited ) {
      FS._root = s_root;
      FS._inited = true;
      return true;
    }
    return false;
  },
  
  loadFileSystemFromFile: function( s_listfile, f_callback ) {
    FS._done_callback = f_callback;
    FS._makeRequest( s_listfile, FS._loadFileSystemCallback );
  },
  
  loadFileSystemFromString: function( s_src, f_callback ) {
    FS._done_callback = f_callback;
    FS._loadFileList( s_src );    
    FS._getNextFile();
  },
  
  notifyLoaded: function( s_fileid ) {
    // file id is not used as any scripts should set it themselves via
    //  the storeXX methods
    FS._getNextFile();
  },
  
  _makeRequest: function( s_file, f_callback, x_data ) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = f_callback;
    xhr.open( "GET", chrome.runtime.getURL( s_file ), true );
    xhr["x-data"] = x_data;
    xhr.send();
  },
  
  _loadFileSystemCallback: function() {
    // "this" points to the request since that sent the event
    if( this.readyState == 4 ) {    // OK
      if( this.status == 200 ) {
        FS._loadFileList( s_src );
        FS._getNextFile();
      } else {
        FS._loadFileFailed( this["x-data"] );
      }
    }
  },
  
  _loadFileList: function( s_src ) {
    FS._files = [];
		var e, s = 0;
		var key, value, alias, path = "";
		while( (e = s_src.indexOf( ";", s )) > -1 ) {
		  var line = s_src.substr( s, (e - s) ).trim();
		  s = (e + 1);
			e = line.indexOf( "=" );
			if( (e > -1) && (line.length > 0) && (line.charAt( 0 ) != "#") ) {
				key = line.substring( 0, e );
				value = line.substring( (e + 1) );
				if( (e = value.indexOf( ">" )) > -1 ) {
				  alias = value.substr( (e + 1) ).trim();
				  value = value.substr( 0, e ).trim();
				} else {
				  alias = value;
				}
				switch( key ) {
				  case "path":
			      path = value;
				    break;
				  case "text":
		      case "script":
				     FS._files.push( {
				        "file": (FS._root + path + value), 
				        "name": (path + alias),
				        "type": key
				      } );
				    break;
  			  case "image":
  			    FS.storeBinaryFile( (path + alias), (FS._root + path + value) );
  			    break;
				}
			}
		}
  },
  
	_getNextFile: function() {
	  if( FS._files.length > 0 ) {
	    var f = FS._files.pop();
	    if( f["type"] == "text" ) {
	      FS._makeRequest( f["file"], FS._storeFile, f );
	    } else if( f["type"] == "script" ) {
	      var s = document.createElement( "script" );
	      s.src = f["file"];
	      document.getElementsByTagName( "head" )[0].appendChild( s );
	      // target script must call "FS.notifyLoaded( s_name )"
	    }
	  } else {
	    FS._done_callback.call( this );
	  }
	},
	
	_storeFile: function() {
    // "this" points to the request since that sent the event
    if( this.readyState == 4 ) {    // OK
      var def = this["x-data"];
      FS.storeRawTextFile( def["name"], this.responseText );
      FS._getNextFile();
    }
  },
    
  _loadFileFailed: function( m_data ) {
    console.log( "failed to load file: " + m_data["file"] );
  },
  
	storeTextFile: function( s_path, a_data ) {
	  return FS._pushFile( s_path, a_data.join( "\n" ) );
	},

	storeRawTextFile: function( s_path, s_data ) {
	  return FS._pushFile( s_path, s_data );
	},

	storeBinaryFile: function( s_path, s_datasrc ) {
	  return FS._pushFile( s_path, s_datasrc, true );
	},

  _pushFile: function( s_path, x_data, b_binary ) {
    return GlueFileManager.setResource( s_path, x_data, b_binary );
  },

};