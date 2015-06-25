/**
 * App startup, loads the config then determines what to do
 *
 * There is code below the definition to start
 */

var CylexiaApp = {
  _inited: false,
  
  init: function() {
    if( !CylexiaApp._inited ) {
      CylexiaApp._inited = true;
      return true;
    }
    return false;
  },
  
  start: function( o_launch_data ) {
    // Load the config file and restart via the callback
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = CylexiaApp.startFromXHR;
    xhr.open( "GET", chrome.runtime.getURL( "config.dat" ), true );
    xhr.send();
  },
  
  startFromXHR: function() {
    // "this" will be the request
    if( this.readyState == 4 ) {    // OK
      if( this.status == 200 ) {
        var config = Utils.loadSimpleConfig( this.responseText );
        var run = Dict.valueOf( config, "run" );
        if( run ) {
          CylexiaApp._startApp( run );
        } else {
          CylexiaApp._startLauncher();
        }
      } else {
        // TODO: show an error
        console.log( "CylexiaApp.startFromXHR: XHR failed" );
      }
    }
  },
  
  _startApp: function( s_name ) {
    var xhr = new XMLHttpRequest();
    xhr["glyde.appname"] = s_name;
    xhr.onreadystatechange = CylexiaApp._startAppWithDefinition;
    xhr.open( "GET", chrome.runtime.getURL( ("/fs/" + s_name + ".app") ), true );
    xhr.send();
  },
  
  _startAppWithDefinition: function() {
    // this is the xhr object
    if( this.readyState == 4 ) {    // OK
      if( this.status == 200 ) {
        var app = Glyde.App.create( this["glyde.appname"], this.responseText );
        if( app !== null ) {
          Glyde.startApp( app );
        } else {
          // TODO: show an error
          console.log( "CylexiaApp._startAppWithDefinition: Glyde.App.create() returned null" );
        }
      } else {
        // TODO: show an error
        console.log( "CylexiaApp._startAppWithDefinition: XHR failed" );
      }
    }
  },
  
  _startLauncher: function() {
    chrome.app.window.create(
      'glydelauncher.html',
      {
        id: 'launcherWindow',
        bounds: {width: 600, height: 600},
        resizable: true
      } 
    );
  }
};

// Attach the startup
if( CylexiaApp.init() ) {
  chrome.app.runtime.onLaunched.addListener( CylexiaApp.start );
}

