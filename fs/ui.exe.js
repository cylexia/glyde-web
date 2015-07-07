/**
 * Emulate ui.exe to provide user interaction via
 *  ask       - get a value
 *  choose    - choose a value from a list
 *
 */
 
var UiExe = {
  _glue_instance: null,
  
  /**
   * ui MODE [options]
   * MODE is "ask", "choose" or "tell"
   * options contains
   *    -prompt     The prompt to show
   *    -to         Target file to write to, use "." for STDOUT or "" (or skip) to not
   *                write anything (ie. for INFO)
   *    -format     Output format:
   *                  txt|text- the string or "" if cancelled (or empty if nothing entered)
   *                  mtext|"" - marked text, "+" (OK) or "-" (Cancel) followed by the value
   *                  json - json object with the keys "status" (1|0) and "value"
   *                  jsonp - same as json but wrapped in the function specified in -func
   *    -value      The current value (a string for "ask", or index for "choose")
   *    -items      / separated list of items to use with choose
   */
  glueExec: function( o_glue, s_args, s_done_label, s_error_label ) {
    UiExe._glue_instance = o_glue;
    var args = UiExe._parseCommandLine( s_args );
    switch( args["_"] ) {
      case "ask":
        UiExe._ask( args, s_done_label, s_error_label );
        break;
      case "choose":
        UiExe._choose( args, s_done_label, s_error_label );
        break;
      case "tell":
        UiExe._tell( args, s_done_label, s_error_label );
        break;
    }
    
    //Glue.run( o_glue, s_done_label );
    return false;   // we'll be manually continuing
  },
  
  _ask: function( d_data, s_done_label, s_error_label ) {
    var value = (d_data["value"] ? d_data["value"] : "");
    var field = _.c( 'input',
        { "width": "95%" },
        { "type": "text", "size": "40", "text": value }
      );
    var frame = UiExe._createDialogFrame(
        Dict.valueOf( d_data, "prompt" ),
        field,
        UiExe._handleAskOK,
        UiExe._handleAskCancel,
        Dict.intValueOf( d_data, "dim" )
      );
    field.addEventListener( "keypress", UiExe._fieldKeyHandler );
    frame["uiexe.field"] = field;
    frame["uiexe.label.done"] = s_done_label;
    frame["uiexe.label.error"] = s_error_label;
    frame["uiexe.data"] = d_data;
    document.getElementsByTagName( "body" )[0].appendChild( frame );
    field.focus();
  },
  
  _choose: function( d_data, s_done_label, s_error_label ) {
    var value = (d_data["value"] ? d_data["value"] : "");
    var field = _.c( 'select',
        { "width": "95%" },
        { "size": "8" }
      );
    var items = (d_data["items"] + "/"), s = 0, e, idx = 0;
    while( (e = items.indexOf( "/", s )) > -1 ) {
      var item = items.substr( s, (e - s) );
      s = (e + 1);
      var opt = _.c( "option" );
      opt.text = item;
      opt.value = idx;
      if( idx == d_data["value"] ) {
        opt.selected = true;
      }
      field.add( opt );
      idx++;
    }
    var frame = UiExe._createDialogFrame(
        Dict.valueOf( d_data, "prompt" ),
        field,
        UiExe._handleChooseOK,
        UiExe._handleChooseCancel,
        Dict.intValueOf( d_data, "dim" )
      );
    field.addEventListener( "keypress", UiExe._fieldKeyHandler );
    frame["uiexe.field"] = field;
    frame["uiexe.label.done"] = s_done_label;
    frame["uiexe.label.error"] = s_error_label;
    frame["uiexe.data"] = d_data;
    document.getElementsByTagName( "body" )[0].appendChild( frame );
    field.focus();
    
  },

  _tell: function( d_data, s_done_label, s_error_label ) {
    var field = _.c( 'div' );
    var lines = (d_data["value"] + "//"), s = 0, e;
    while( (e = lines.indexOf( "//", s )) > -1 ) {
      var line = lines.substr( s, (e - s) ).trim();
      s = (e + 2);
      if( !line ) {
        line = "\u00A0";    // nbsp in unicode
      }
      field.appendChild( _.at( _.c( "div" ), line ) );
    }
    var frame = UiExe._createDialogFrame(
        Dict.valueOf( d_data, "prompt" ),
        field,
        UiExe._handleTellOK,
        null,
        Dict.intValueOf( d_data, "dim" )
      );
    field.addEventListener( "keypress", UiExe._fieldKeyHandler );
    frame["uiexe.field"] = field;
    frame["uiexe.label.done"] = s_done_label;
    frame["uiexe.label.error"] = s_error_label;
    frame["uiexe.data"] = d_data;
    document.getElementsByTagName( "body" )[0].appendChild( frame );
    field.focus();
  },
  
  _createDialogFrame: function( s_text, o_innerdiv, f_on_ok, f_on_cancel, i_usedimmer ) {
    var text = _.c( 'div', { "padding": "5px", "font-weight": "bold" } );
    _.at( text, s_text );
    var wrap = _.c( 'div', {
        "overflow": "auto",
        "text-align": "center"
      } );
    wrap.appendChild( o_innerdiv );
    var btnstyle = {
          "margin": "2px", "padding": "5px", "background": "#ddd",
          "font-weight": "bold", "border": "1px solid #000", "cursor": "pointer"
      };
    var btns = _.c( 'div', { "padding": "15px" } );
    var ok, cancel;
    ok = _.at( _.c( 'button', btnstyle ), "OK" );
    ok.style["border"] = "2px solid #000";
    ok.addEventListener( "click", f_on_ok );
    ok["uiexe.type"] = 1;
    btns.appendChild( ok );
    if( f_on_cancel ) {
      cancel = _.at( _.c( 'button', btnstyle ), "Cancel" );
      cancel.addEventListener( "click", f_on_cancel );
      cancel["uiexe.type"] = 2;
      btns.appendChild( cancel );
    }
    var back = _.c( 'div', {
        "border": "2px solid #555",
        "margin": "1px",
        "background": "#fff",
        "padding": "10px",
        "position": "absolute",
        "width": "600px",
        //"height": "200px"
      } );
    back.appendChild( text );
    back.appendChild( wrap );
    back.appendChild( btns );
    // TODO: buttons
    var frame = _.c( 'div', {
        "position": "absolute",
        "top": "0px", "left": "0px", "width": "100%", "height": "100%",
        "text-align": "center",
        "z-index": "1000",
      } );
    if( i_usedimmer == 1 ) {
      var dimmer = _.c( 'div', {
          "position": "absolute",
          "top": "0px", "left": "0px", "width": "100%", "height": "100%",
          "background": "#444", "opacity": "0.5"
        } );
      frame.appendChild( dimmer );
    } else {
      back.style.backgroundColor = "#ffd";
    }
    // clientWidth is inside width taking into account borders etc.
    // offsetWidth is the total width
    var body = document.getElementsByTagName("body")[0];
    _.s( back, { "left": ((body.clientWidth - 600) / 2), "top": "0px" } );
    frame.appendChild( back );
    ok["uiexe.frame"] = frame;
    if( f_on_cancel ) {
      cancel["uiexe.frame"] = frame;
    }
    return frame;
  },
  
  // Handle enter/esc
  _fieldKeyHandler: function( e ) {
    e = (e || event);
    var type;
    if( e.keyCode == 13 ) {
      type = 1;
    } else if( e.keyCode == 27 ) {    // doesn't get sent apparently...
      type = 2;
    } else {
      return;
    }
    var btns = document.getElementsByTagName( "button" );
    for( var i = 0; i < btns.length; i++ ) {
      if( btns[i]["uiexe.type"] && (btns[i]["uiexe.type"] == type) ) {
        btns[i].click();
        e.preventDefault();
        return;
      }
    }
  },
  
  _handleAskOK: function() {
      var frame = this["uiexe.frame"];
      frame.parentNode.removeChild( frame );
      UiExe._saveResult( frame["uiexe.data"], true, frame["uiexe.field"].value );
      GluePlatform.execFinished( UiExe._glue_instance, frame["uiexe.label.done"] );
  },
  
  _handleAskCancel: function() {
      var frame = this["uiexe.frame"];
      frame.parentNode.removeChild( frame );
      UiExe._saveResult( frame["uiexe.data"], false, "" );
      Glue.run( UiExe._glue_instance, frame["uiexe.label.done"] );
  },
  
  _handleChooseOK: function() {
      var frame = this["uiexe.frame"];
      frame.parentNode.removeChild( frame );
      UiExe._saveResult( frame["uiexe.data"], true, frame["uiexe.field"].value );
      Glue.run( UiExe._glue_instance, frame["uiexe.label.done"] );
  },
  
  _handleChooseCancel: function() {
      var frame = this["uiexe.frame"];
      frame.parentNode.removeChild( frame );
      UiExe._saveResult( frame["uiexe.data"], false, "" );
      Glue.run( UiExe._glue_instance, frame["uiexe.label.done"] );
  },
  
  _handleTellOK: function() {
      var frame = this["uiexe.frame"];
      frame.parentNode.removeChild( frame );
      UiExe._saveResult( frame["uiexe.data"], true, 1 );
      Glue.run( UiExe._glue_instance, frame["uiexe.label.done"] );
  },
  
  _saveResult: function( d_data, b_state, s_value ) {
    var res, fmt = d_data["format"];
    switch( fmt ) {
      case "json":
      case "jsonp":
        res = ('{ "value":' + (b_state ? "1" : "0") + ', value: "' +
            UiExe._deQuote( s_value ) + '" }'
          );
        if( fmt == "jsonp" ) {
          res = (d_data["func"] + "( " + res + " );");
        }
        break;
      case "text":
        res = (b_state ? s_value : "");
        break;
      default:
        res = ((b_state ? "+" : "-") + s_value);
        break;
    }
    if( d_data["to"] ) {
      if( d_data["to"] == "." ) {   // STDOUT normally
        console.log( res );
      } else {
        GlueFileManager.writeText( d_data["to"], res );
      }
    }
  },
  
  _parseCommandLine: function( s_cmdline, d_defaults ) {
        var d;
        if( d_defaults ) {
            d = d_defaults;
        } else {
            d = Dict.create();
        }
        var cmd, k = "_", v = "", in_q = false, word = "", c;
        for( var i = 0, l = s_cmdline.length; i <= l; i++ ) {
          if( i < l ) {
            c = s_cmdline.charAt( i );
          } else {
            c = " ";
          }
          if( in_q ) {
            if( c == '"' ) {
              in_q = false;
            } else if( c == "|" ) {
              word += s_cmdline.charAt( ++i );
            } else {
              word += c;
            }
          } else {
            if( c == " " ) {
              if( (word.length > 0) && (word.charAt( 0 ) == "-") && (k === "") ) {
                k = word.substr( 1 ).toLowerCase();
              } else {
                Dict.set( d, k, word );
                k = "";
              }
              word = "";
            } else if( c == "|" ) {
              word += s_cmdline.charAt( ++i );
            } else if( c == '"' ) {
              in_q = true;
            } else {
              word += c;
            }
          }
        }
        return d;
    }
    
};
    
    
GluePlatform.setExecApp( "ui.exe.js", "ui", UiExe );
