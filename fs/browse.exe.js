
var BrowseExe = {
  glueExec: function( o_glue, s_args, s_done_label, s_error_label ) {
    if( chrome.tabs ) {
      chrome.tabs.create({ url: s_args });
    } else {
      window.open( s_args );
    }

    Glue.run( o_glue, s_done_label );
    return true;
  }
};
    
GluePlatform.setExecApp( "browse", BrowseExe );
if( FS ) {
  FS.notifyLoaded( "browse.exe.js" );
}
