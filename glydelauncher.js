var GlydeLauncher = {
  _config: null,
  _inited: false,
  
	init: function() { "use strict";
	  if( !GlydeLauncher._inited ) {
		  GlydeLauncher._inited = true;
	    return true;
	  }
	  return false;
	},
	
	start: function() {
    // Load the config file and restart via the callback
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = GlydeLauncher.startWithConfig;
    xhr.open( "GET", chrome.runtime.getURL( "config.dat" ), true );
    xhr.send();
  },

	startWithConfig: function() {
    // "this" will be the request
    if( this.readyState == 4 ) {    // OK
      if( this.status == 200 ) {
        GlydeLauncher._config = Utils.loadSimpleConfig( this.responseText );
        GlydeLauncher.loadAppFiles();
      } else {
        // TODO: show an error page
      }
    }
	},
    
  loadAppFiles: function() {
    GlueFileManager.init();     // we'll be needing this since FS saves into it
    
    var apps = Utils.split( Dict.valueOf( GlydeLauncher._config, "app" ), "\n" );
    // get all the files the apps reference, we could just get the icons and ".app"
    //  files if we ever need to reduce resources
    var files = [], appfiles;
    for( var i = 0; i < apps.length; i++ ) {
      files.push( "path=;" );
      files.push( ("text=" + apps[i] + ".app;") );
      appfiles = Utils.split( Dict.valueOf( GlydeLauncher._config, apps[i] ), "\n" );
      for( var ai = 0; ai < appfiles.length; ai++ ) {
        files.push( (appfiles[ai] + ";") );
      }
    }

    FS.init( "/fs/" );
    FS.loadFileSystemFromString( files.join( "\n" ), GlydeLauncher.layoutLauncher );
  },
  
  layoutLauncher: function() {
    var apps = Utils.split( Dict.valueOf( GlydeLauncher._config, "app" ), "\n" );
    var launcher = _.e( "launcherview" );

    if( apps.length > 0 ) {
      for( i = 0; i < apps.length; i++ ) {
        path = (apps[i] + ".app");
        var app = Glyde.App.create( path );
        var el = _.c( "div",
            { 
              "margin-bottom": "2px",
              "cursor": "pointer"
            },
            { 
              "glyde.app": app,
              "className": "launcher_button"
            }
          );
        var icon;
        var icon_src = GlueFileManager.readBinary( Glyde.App.getIconFile( app ) );
        if( icon_src ) {
          icon = icon_src;
        } else {
          icon = _.c( "img", {}, { "src": "assets/glyde128.png" } );
        }
        _.s( icon, { "width": "64px", "height": "64px", "vertical-align": "middle", "margin-right": "10px" } );
        el.appendChild( icon );
        el.appendChild( document.createTextNode( Glyde.App.getTitle( app ) ) );
        el.addEventListener( "click", GlydeLauncher._launchFromClick, false );
        launcher.appendChild( el );
      }
    } else {
      launcher.appendChild( document.createTextNode( "No Apps" ) );
    }
	},

  _launchFromClick: function( o_evt ) {
    // as this is an event handler "this" will point to the element calling it
    if( this["glyde.app"] ) {
      Glyde.startApp( this["glyde.app"] );
    }
  }
};

// Initialise and start the request for the config
if( GlydeLauncher.init() ) {
  GlydeLauncher.start();
}
