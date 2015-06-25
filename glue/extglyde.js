// extglyde
//
// Glyde Glue Plugin
// (c)2015 by Cylexia, All Rights Reserved
//
//  Version: 1.15.0625
//
//  MIT License

var ExtGlyde = {
	GLUE_STOP_ACTION: -200,
	plane: null,                // Canvas
	resources: null,
	styles: null,
	buttons: null,
	keys: null,
	button_sequence: [],
	timers: null,
	timer_manager: null,
	action: "",
	action_params: "",
	resume_label: "",
	last_action_id: "",
	window_title: "",
	window_width: -1,
	window_height: -1,
  background_colour: "#fff",
  
  _inited: false,

  init: function( canvas, filemanager ) {
    "use strict";
    if( !ExtGlyde._inited ) {
      ExtGlyde.plane = canvas;
      ExtGlyde.reset();
      ExtGlyde._inited = true;
      return true;
    }
    return false;
  },

  reset: function() {
    ExtGlyde.clearUI();
  	ExtGlyde.resources = null;
	  ExtGlyde.styles = null;
	  ExtGlyde.timers = null;
	  ExtGlyde.last_action_id = "";
	  ExtGlyde.window_title = "";
	  ExtGlyde.window_width = -1;
	  ExtGlyde.window_height = -1;
    ExtGlyde.background_colour = "#fff";
  },
  

  setSize: function( w, h ) {
    ExtGlyde.window_width = w;
    ExtGlyde.window_height = h;
    ExtGlyde.plane.width = w;//(w + "px");
    ExtGlyde.plane.height = h;//(h + "px");
    ExtGlyde._drawRect( ExtGlyde.getBitmap(), { 
        x: 0, y: 0, 
        width: w, height: h, 
        colour: ExtGlyde.background_colour 
      }, true );
  },

  getWindowTitle: function() {
    return ExtGlyde.window_title;
  },
  
  getWindowWidth: function() {
    return ExtGlyde.window_width;
  },

  getWindowHeight: function() {
    return ExtGlyde.window_height;
  },

	/**
	 * If set then the script requests that the given action be performed then resumed from
	 * getResumeLabel().  This is cleared once read
	 * @return the action or null
	 */
	getAction: function() {
	  var o = ExtGlyde.action;
	  ExtGlyde.action = null;
	  return o;
	},

  getActionParams: function() {
    return ExtGlyde.action_params;
  },
  
	/**
	 * Certain actions call back to the runtime host and need to be resumed, resume from this label
	 * This is cleared once read
	 * @return the label
	 */
	getResumeLabel: function() {
	  var o = ExtGlyde.resume_label;
	  ExtGlyde.resume_label = null;
	  return o;
	},

	/**
	 * The bitmap the drawing operations use
	 * @return
	 */
	getBitmap: function() {
		return ExtGlyde.plane.getContext( "2d" );
	},

	/**
	 * Called when this is attached to a {@link com.cylexia.mobile.lib.glue.Glue} instance
	 *
	 * @param g the instance being attached to
	 */
	glueAttach: function( f_plugin, f_glue ) {
    window.addEventListener( "keydown", function( e ) { 
        ExtGlyde._keyDownHandler( f_glue, (e || window.event) ); 
      } );
    window.addEventListener( "keypress", function( e ) {
        ExtGlyde._keyPressHandler( f_glue, (e || window.event) );
      } );
	},

	/**
	 * Called to execute a glue command
	 *
	 * @param w    the command line.  The command is in "_"
	 * @param vars the current Glue variables map
	 * @return 1 if the command was successful, 0 if it failed or -1 if it didn't belong to this
	 * plugin
	 */
	glueCommand: function( glue, w, vars ) {
		var cmd = Dict.valueOf( w, "_" );
		if( cmd && cmd.startsWith( "f." ) ) {
		  var wc = Dict.valueOf( w, cmd );
			cmd = cmd.substring( 2 );
			if( (cmd == "setwidth") || (cmd == "setviewwidth") ) {
				return ExtGlyde.setupView( w );
			} else if( cmd == "settitle" ) {
				return ExtGlyde.setTitle( wc, w );

			} else if( cmd == "doaction" ) {
				return ExtGlyde.doAction( wc, w );

			} else if( (cmd == "clear") || (cmd == "clearview") ) {
				ExtGlyde.clearUI();

			} else if( cmd == "loadresource" ) {
				return ExtGlyde.loadResource( glue, wc, Dict.valueOf( w, "as" ) );

			} else if( cmd == "removeresource" ) {
				if( ExtGlyde.resources !== null ) {
					delete ExtGlyde.resources[wc];
				}

			} else if( cmd == "setstyle" ) {
				ExtGlyde.setStyle( wc, w );

			} else if( cmd == "getlastactionid" ) {
				Dict.set( vars, Dict.valueOf( w, "into" ), ExtGlyde.last_action_id );

			} else if( cmd == "onkey" ) {
				if( ExtGlyde.keys === null ) {
					ExtGlyde.keys = Dict.create();
				}
				var ke = Dict.create();
				Dict.set( ke, "label", Dict.valueOf( w, "goto" ) );
				Dict.set( ke, "id", Dict.valueOf( w, "useid" ) );
				Dict.set( ExtGlyde.keys, wc, ke );

			} else if( cmd == "starttimer" ) {
			  ExtGlyde._startTimer( glue, wc, Dict.intValueOf( w, "interval" ), Dict.valueOf( w, "ontickgoto" ) );
			} else if( cmd == "stoptimer" ) {
			  ExtGlyde._stopTimer( wc );
			} else if( cmd == "stopalltimers" ) {
			  ExtGlyde._stopTimer( "" );

			} else if( cmd == "drawas" ) {
				ExtGlyde.drawAs( wc, w );

			} else if( cmd == "writeas" ) {
				// TODO: colour
				return ExtGlyde.writeAs( wc, w );

			} else if( (cmd == "markas") || (cmd == "addbutton") ) {
				return ExtGlyde.markAs( wc, w );

			} else if( cmd == "paintrectas" ) {
				return ExtGlyde.paintRectAs( wc, w, false );

			} else if( cmd == "paintfilledrectas" ) {
				return ExtGlyde.paintRectAs( wc, w, true );

			} else if( cmd == "exit" ) {
			  if( chrome && chrome.app ) {
			    chrome.app.window.current().close();
			  } else if( window ) {
			    window.close();
			  }
			  return Glue.PLUGIN_DONE_EXIT_ALL;
			
			} else {
				return -1;
			}
			return 1;
		}
		return 0;
	},

	getLabelForButtonAt: function( i_x, i_y ) {
		if( ExtGlyde.buttons !== null ) {
		  for( var i = 0; i < ExtGlyde.button_sequence.length; i++ ) {
			  var id = ExtGlyde.button_sequence[i];
				var btn = ExtGlyde.buttons[id];
				var r = ExtGlyde.Button.getRect( btn );
				if( ExtGlyde.Rect.containsPoint( r, i_x, i_y ) ) {
				  ExtGlyde.last_action_id = id;
				  return ExtGlyde.Button.getLabel( btn );
			  }
			}
		}
		return null;
	},

	/**
	 * Get the id of the button at the given index
	 * @param index the index of the button
	 * @return the id or null if the index is out of bounds
	 */
	getButtonIdAtIndex: function( index ) {
		if( ExtGlyde.button_sequence.length > 0 ) {
			if( (index >= 0) && (index < ExtGlyde.button_sequence.length) ) {
				return ExtGlyde.button_sequence[index];
			}
		}
		return null;
	},

	/**
	 * Get the rect of the given indexed button
	 * @param index the button index
	 * @return the rect as ExtGlyde.Rect or null if index is out of bounds
	 */
	getButtonRectAtIndex: function( index ) {
		var id = ExtGlyde.getButtonIdAtIndex( index );
		if( id !== null ) {
			return ExtGlyde.Button.getRect( ExtGlyde.buttons[id] );
		}
		return null;
	},

	/**
	 * Return the label for the given indexed button.  Also sets the lastActionId value
	 * @param index the index
	 * @return the label or null if index is out of bounds
	 */
	getButtonLabelAtIndex: function( index ) {
		if( (index >= 0) && (index < ExtGlyde.button_sequence.length) ) {
			var id = button_sequence[index];
			if( id !== null ) {
				ExtGlyde.last_action_id = id;
				return ExtGlyde.Button.getLabel( buttons[id] );
			}
		}
		return null;
	},

	getButtonCount: function() {
		return ExtGlyde.button_sequence.length;
	},

	/**
	 * Add a definition to the (lazily created) styles map.  Note, the complete string is stored
	 * so beware that keys like "_" and "f.setstyle" are added too
	 * @param name string: the name of the style 
	 * @param data map: the complete arguments string
	 */
	setStyle: function( name, data ) {
		if( ExtGlyde.styles === null ) {
			ExtGlyde.styles = Dict.create();
		}
		Dict.set( ExtGlyde.styles, name, data );
	},

	setupView: function( w ) {
		if( Dict.containsKey( w, "backgroundcolour" ) ) {
			ExtGlyde.background_colour = Dict.valueOf( w, "backgroundcolour" );
		} else {
			this.background = "#fff";
		}
		ExtGlyde.setSize( Dict.intValueOf( w, Dict.valueOf( w, "_" ) ), Dict.intValueOf( w, "height" ) );
		return true;
	},

  setTitle: function( wc, w ) {
    var tb_title = _.e( "tb_title" );
		if( tb_title ) {
		  tb_title.removeChild( tb_title.childNodes[0] );
		  _.at( tb_title, wc );
		}
		if( window ) {
		  window.title = wc;
		  document.title = wc;
		}
		_.e( "windowtitlebar" ).style["display"] = (wc ? "block" : "none");
		return 1;
  },

	clearUI: function() {
		ExtGlyde.button_sequence = [];
		if( ExtGlyde.buttons !== null ) {
		  Dict.delete( ExtGlyde.buttons );
		}
		ExtGlyde.buttons = Dict.create();
		if( ExtGlyde.keys !== null ) {
		  Dict.delete( ExtGlyde.keys );
		}
		ExtGlyde.keys = Dict.create();
		ExtGlyde.setSize( ExtGlyde.window_width, ExtGlyde.window_height );
	},

	doAction: function( s_action, d_w ) {
	  "use strict";
		ExtGlyde.action = s_action;
		ExtGlyde.action_params = Dict.valueOf( d_w, "args", Dict.valueOf( d_w, "withargs" ) );
		var done_label = Dict.valueOf( d_w, "ondonegoto" );
		ExtGlue.resume_label = (
		    done_label + "\t" +
		    Dict.valueOf( d_w, "onerrorgoto", done_label ) + "\t" +
		    Dict.valueOf( d_w, "onunsupportedgoto", done_label ) 
		  );
		return ExtFrontEnd.GLUE_STOP_ACTION;		// expects labels to be DONE|ERROR|UNSUPPORTED
	},

	// TODO: this should use a rect and alignment options along with colour support
	writeAs: function( s_id, d_args ) {
	  "use strict";
		ExtGlyde.updateFromStyle( d_args );
		var text = Dict.valueOf( d_args, "value" );
		var rect = ExtGlyde.Rect.createFromCommandArgs( d_args );
		var x = ExtGlyde.Rect.getLeft( rect );
		var y = ExtGlyde.Rect.getTop( rect );
		var rw = ExtGlyde.Rect.getWidth( rect );
		var rh = ExtGlyde.Rect.getHeight( rect );
		var size = Dict.intValueOf( d_args, "size", 2 );
		var thickness = Dict.intValueOf( d_args, "thickness", 1 );
		var tw = (VecText.getGlyphWidth( size, thickness ) * text.length);
		var th = VecText.getGlyphHeight( size, thickness );
		var tx, ty;
		if( rw > 0 ) {
			var align = Dict.valueOf( d_args, "align", "2" );
			if( (align == "2") || (align == "centre") ) {
				tx = (x + ((rw - tw) / 2));
			} else if( (align == "1" ) || (align == "right") ) {
				tx = (x + (rw - tw));
			} else {
				tx = x;
			}
		} else {
			rw = tw;
			tx = x;
		}
		if( rh > 0 ) {
			ty = (y + ((rh - th) / 2));
		} else {
			rh = th;
			ty = y;
		}
		VecText.drawString( ExtGlyde.getBitmap(), text, Dict.valueOf( d_args, "colour", "#000" ), tx, ty, size, thickness, (thickness + 1) );
		rect = ExtGlyde.Rect.create( x, y, rw, rh );    // Dict: ExtGlyde.Rect
		return ExtGlyde.buttonise( s_id, rect, d_args );
	},

	drawAs: function( s_id, d_args ) {
		ExtGlyde.updateFromStyle( d_args );
		var rect = ExtGlyde.Rect.createFromCommandArgs( d_args );
		var rid = Dict.valueOf( d_args, "id", Dict.valueOf( d_args, "resource" ) );
		if( ExtGlyde.resources !== null ) {
			var b = rid.indexOf( '.' );
			if( b > -1 ) {
				var resid = rid.substring( 0, b );
				var imgid = rid.substring( (b + 1) );
				var keys = Dict.keys( ExtGlyde.resources );
				for( var i = 0; i < keys.length; i++ ) {
				  var imgmap = Dict.valueOf( ExtGlyde.resources, keys[i] );    // imgmap: ExtGlyde.ImageMap
				  var x = ExtGlyde.Rect.getLeft( rect );
				  var y = ExtGlyde.Rect.getTop( rect );
					if( ExtGlyde.ImageMap.drawToCanvas( imgmap, imgid, ExtGlyde.getBitmap(), x, y ) ) {
						var maprect = ExtGlyde.ImageMap.getRectWithId( imgmap, imgid );
						var imgrect = ExtGlyde.Rect.create( 
						    x, y, 
						    ExtGlyde.Rect.getWidth( maprect ), ExtGlyde.Rect.getHeight( maprect ) 
						  );
						return ExtGlyde.buttonise( s_id, imgrect, d_args );
					}
				}
			}
		}
		return false;
	},

	markAs: function( s_id, d_args ) {
		ExtGlyde.updateFromStyle( d_args );
		return ExtGlyde.buttonise(
				s_id,
				ExtGlyde.Rect.createFromCommandArgs( d_args ),
				m_args
			);
	},

	paintRectAs: function( s_id, d_args, b_filled ) {
		ExtGlyde.updateFromStyle( d_args );
		var rect = ExtGlyde.Rect.createFromCommandArgs( d_args );
		var d = Dict.create();
  	Dict.set( d, "rect", rect );
    Dict.set( d, "colour", Dict.valueOf( d_args, "colour", "#000" ) );
		ExtGlyde._drawRect( ExtGlyde.getBitmap(), d, b_filled );
		
		return ExtGlyde.buttonise( s_id, rect, d_args );
	},

	buttonise: function( s_id, d_rect, d_args ) {
	  "use strict";
		if( Dict.containsKey( d_args, "border" ) ) {
		  var d = Dict.create();
		  Dict.set( d, "rect", d_rect );
		  Dict.set( d, "colour", Dict.valueOf( d_args, "colour", "#000" ) );
		  ExtGlyde._drawRect( ExtGlyde.getBitmap(), d );
		}
		if( Dict.containsKey( d_args, "onclickgoto" ) ) {
			return ExtGlyde.addButton( s_id, d_rect, Dict.valueOf( d_args, "onclickgoto" ) );
		} else {
			return true;
		}
	},

	addButton: function( s_id, d_rect, s_label ) {
		if( ExtGlyde.buttons === null ) {
			ExtGlyde.buttons = Dict.create();
			ExtGlyde.button_sequence = [];
		}
		if( !Dict.containsKey( ExtGlyde.buttons, s_id ) ) {
			Dict.set( ExtGlyde.buttons, s_id, ExtGlyde.Button.createFromRect( d_rect, s_label ) );
			ExtGlyde.button_sequence.push( s_id );
			return true;
		}
		return false;
	},

	updateFromStyle: function( d_a ) {
	  "use strict";
		if( (ExtGlyde.styles === null) || (ExtGlyde.styles.length === 0) ) {
			return;
		}
		if( Dict.containsKey( d_a, "style" ) ) {
			var style = Dict.valueOf( styles, Dict.valueOf( d_a, "style" ) );
			var keys = Dict.keys( style );
			for( var i = 0; i < keys.length; i++ ) {
				var k = keys[i];
				if( !Dict.containsKey( d_a, k ) ) {
					Dict.set( d_a, k, Dict.valueOf( style, keys[i] ) );
				}
			}
		}
	},

	loadResource: function( o_glue, s_src, s_id ) {
		if( ExtGlyde.resources === null ) {
			ExtGlyde.resources = Dict.create();
		}
		if( Dict.containsKey( ExtGlyde.resources, s_id ) ) {
		  // deallocate
		}
		// resources can be replaced using the same ids
		var data = GlueFileManager.readText( s_src );
		Dict.set( ExtGlyde.resources, s_id, ExtGlyde.ImageMap.create( data ) );
		return true;
	},
  
	_drawRect: function( o_context, d_def, b_filled ) {
	  "use strict";
	  var x, y, w, h;
	  if( Dict.containsKey( d_def, "rect" ) ) {
	    var r = Dict.dictValueOf( d_def, "rect" );
	    x = ExtGlyde.Rect.getLeft( r );
	    y = ExtGlyde.Rect.getTop( r );
	    w = ExtGlyde.Rect.getWidth( r );
	    h = ExtGlyde.Rect.getHeight( r );
	  } else {
	    x = Dict.intValueOf( d_def, "x" );
	    y = Dict.intValueOf( d_def, "y" );
	    w = Dict.intValueOf( d_def, "width" );
	    h = Dict.intValueOf( d_def, "height" );
	  }
	  if( b_filled ) {
	    o_context.fillStyle = Dict.valueOf( d_def, "colour", "#000" );
	    o_context.fillRect( x, y, w, h );
	  } else {
	    o_context.fillStyle = "none";
	    o_context.strokeStyle = Dict.valueOf( d_def, "colour", "#000" );
	    o_context.lineWidth = 1;
	    o_context.strokeRect( x, y, w, h );
	  }
	},

  _timerFired: function() {
    if( ExtGlyde.timers ) {
      for( var id in ExtGlyde.timers ) {
        var t = ExtGlyde.timers[id];
        t["count"]--;
        if( t["count"] === 0 ) {
          t["count"] = t["reset"];
          Glue.run( t["glue"], t["label"] );
        }
      }
    }
  },

  _startTimer: function( o_glue, s_id, i_tenths, s_label ) {
    if( !ExtGlyde.timers ) {
      ExtGlyde.timer_manager = window.setInterval( ExtGlyde._timerFired, 100 );   // install our timer
      ExtGlyde.timers = {};
    }
    var t = { 
        "glue": o_glue,
        "count": i_tenths,
        "reset": i_tenths,
        "label": s_label
      };
    ExtGlyde.timers[s_id] = t;
  },
  
  _stopTimer: function( s_id ) {
    if( !ExtGlyde.timers ) {
      return;
    }
    if( s_id ) {
      if( ExtGlyde.timers[s_id] ) {
        delete ExtGlyde.timers[s_id];
      }
      if( ExtGlyde.timers.length > 0 ) {
        return;
      }
    }
    // out of timers or requested that we stop them all
    if( ExtGlyde.timer_manager ) {
      window.clearInterval( ExtGlyde.timer_manager );
      ExtGlyde.timer_manager = null;
    }
    ExtGlyde.timers = null;
  },
  
  // keyboard handling
  _keyDownHandler: function( f_glue, e ) {
    e = (e || window.event);
    var kmap = { 
        37: "direction_left", 38: "direction_up", 39: "direction_right",
        40: "direction_down", 27: "escape", 9: "tab", 13: "enter",
        8: "backspace", 46: "delete", 112: "f1", 113: "f2", 114: "f3", 115: "f4",
        116: "f5", 117: "f6", 118: "f7", 119: "f8", 120: "f9", 121: "f10",
        122: "f11", 123: "f12"
      };
    if( e.keyCode in kmap ) {
      if( ExtGlyde._notifyKeyPress( f_glue, kmap[e.keyCode] ) ) {
        e.preventDefault();
      }
    }
  },

  _keyPressHandler: function( f_glue, e ) {
    e = (e || window.event );
    if( ExtGlyde._notifyKeyPress( f_glue, String.fromCharCode( e.charCode ) ) ) {
      e.preventDefault();
    }
  },

  _notifyKeyPress: function( f_glue, s_key ) {      // boolean
    if( ExtGlyde.keys && (s_key in ExtGlyde.keys) ) {
      var ke = ExtGlyde.keys[s_key];
      ExtGlyde.last_action_id = Dict.valueOf( ke, "id" );
      Glue.run( f_glue, Dict.valueOf( ke, "label" ) );
      return true;
    }
    return false;
  },
  
	/**
	 * Stores a button
	 */
	Button: {
	  create: function( i_x, i_y, i_w, i_h, s_label ) {   // Dict: ExtGlyde.Button
	    return Button.createFromRect(
	        ExtGlyde.Rect.create( i_x, i_y, i_w, i_h ),
	        s_label 
      );
	  },
	  
	  createFromRect: function( d_rect, s_label ) {   // Dict: ExtGlyde.Button
	    var d = Dict.create();
	    Dict.set( d, "rect", d_rect );
	    Dict.set( d, "label", s_label );
  	  return d;
	  },
	  
	  getLabel: function( d_button ) {
	    return d_button.label;
	  },
	  
	  getRect: function( d_button ) {
	    return d_button.rect;
	  }
	},
	
	/**
	 * Access to a Rect
	 */
	Rect: {
	  create: function( i_x, i_y, i_w, i_h ) {    // Dict: ExtGlyde.Rect
	    var r = Dict.create();
	    Dict.set( r, "x", i_x );
	    Dict.set( r, "y", i_y );
	    Dict.set( r, "w", i_w );
	    Dict.set( r, "h", i_h );
	    return r;
	  },
	  
	  createFromCommandArgs: function( d_args ) {   // Dict: ExtGlyde.Rect
	    "use strict";
  	  var x = Dict.intValueOf( d_args, "x", Dict.intValueOf( d_args, "atx" ) );
  		var y = Dict.intValueOf( d_args, "y", Dict.intValueOf( d_args, "aty" ) );
  		var w = Dict.intValueOf( d_args, "width" );
  		var h = Dict.intValueOf( d_args, "height" );
	    return ExtGlyde.Rect.create( x, y, w, h );
	  },
	  
    containsPoint: function( d_rect, i_x, i_y ) {
      var rx = Dict.intValueOf( d_rect, "x" );
      var ry = Dict.intValueOf( d_rect, "y" );
      if( (i_x >= rx) && (i_y >= ry) ) {
        if( (i_x < (rx + Dict.intValueOf( d_rect, "w" ))) && (i_y < (ry + Dict.intValueOf( d_rect, "h" ))) ) {
          return true;
        }
      }
      return false;
	  },
	  
	  getLeft: function( o_rect ) {
	    return o_rect.x;
	  },

	  getTop: function( o_rect ) {
	    return o_rect.y;
	  },

	  getWidth: function( o_rect ) {
	    return o_rect.w;
	  },

	  getHeight: function( o_rect ) {
	    return o_rect.h;
	  },
	  
	  getRight: function( o_rect ) {
	    return (o_rect.x + o_rect.w);
	  },

	  getBottom: function( o_rect ) {
	    return (o_rect.y + o_rect.h);
	  }
  },
  
  
	/**
	 * Processes a .map source loading the image named in it or the specified image
	 * @returns a Dict for use with ExtGlyde.ImageMap
	 */
	ImageMap: {
	  create: function( s_mapdata ) {   // Dict: ImageMap
	    var im = Dict.create();
	    var im_rects = Dict.create();
			var e, i;
			var key, value;
			var bmpsrc;
			while( (i = s_mapdata.indexOf( ";" )) > -1 ) {
			  var line = s_mapdata.substr( 0, i ).trim();
			  s_mapdata = s_mapdata.substr( (i + 1) );
				e = line.indexOf( "=" );
				if( e > -1 ) {
					key = line.substring( 0, e );
					value = line.substring( (e + 1) );
					if( key.startsWith( "." ) ) {
						if( key == ".img" ) {
							if( !bmpsrc ) {
								bmpsrc = value;
							}
						}
					} else {
						Dict.set( im_rects, key, ExtGlyde.ImageMap._decodeRect( value ) );
					}
				}
			}
			Dict.set( im, "image", ExtGlyde.ImageMap._loadBitmap( bmpsrc ) );
			Dict.set( im, "rects", im_rects );
			return im;
		},

		getRectWithId: function( o_imap, s_id ) {   // Dict: ExtGlyde.Rect
			var d_rects = Dict.dictValueOf( o_imap, "rects" );
			return Dict.dictValueOf( d_rects, s_id );
		},

		drawToCanvas: function( o_imap, s_id, o_context, i_x, i_y ) { "use strict";
			var src = ExtGlyde.ImageMap.getRectWithId( o_imap, s_id );    // Dict: ExtGlyde.Rect
			if( src !== null ) {
				var w = ExtGlyde.Rect.getWidth( src );
				var h = ExtGlyde.Rect.getHeight( src );
				o_context.drawImage( 
				    o_imap.image, 
				    ExtGlyde.Rect.getLeft( src ), ExtGlyde.Rect.getTop( src ), w, h,
				    i_x, i_y, w, h
				  );
				return true;
			}
			return false;
		},

		_loadBitmap: function( s_src ) {
			var data = GlueFileManager.readBinary( s_src );
			if( data !== null ) {
			  return data;
			}
			// show an error some how
			return null;
		},

		_decodeRect: function( s_e ) {    // Dict
			if( s_e.charAt( 1 ) == ':' ) {
				var l = (s_e.charCodeAt( 0 ) - 48);
				var i = 2, x, y, w, h;
				x = ExtGlyde.ImageMap.toInt( s_e.substring( i, (i + l) ) );
				i += l;
				y = ExtGlyde.ImageMap.toInt( s_e.substring( i, (i + l) ) );
				i += l;
				w = ExtGlyde.ImageMap.toInt( s_e.substring( i, (i + l) ) );
				i += l;
				h = ExtGlyde.ImageMap.toInt( s_e.substring( i ) );
				return ExtGlyde.Rect.create( x, y, w, h );
			}
			return null;
		},
		
		toInt: function( s_v ) {
		  var n = parseInt( s_v );
		  if( !isNaN( n ) ) {
		    return n;
		  }
		  return 0;
		}
	}
};