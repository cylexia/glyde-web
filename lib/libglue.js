// libglue
//
// Glue (c)2010-15 by Cylexia
// All Rights Reserved
//
//  Version: 3.15.0625
//
// MIT License

var Glue = {
		VERSION: '3.15.0624',
		PLUGIN_DONE: 1,
		PLUGIN_NOT_MINE: -1,
		PLUGIN_INLINE_REDIRECT: -2,      // call setRedirectLabel() to set the label
		PLUGIN_DONE_STOP_OK: -3,
		PLUGIN_DONE_EXIT_ALL: -254,

		esc: [],
		stdout: null,
		exitHandler: null,

		_inited: false,
    
    init: function( x ) {
  	  "use strict";
      if( !Glue._inited ) {
				GlueFileManager.init();
        Glue._inited = true;
      }
			x.plugins = [];
			x.script = '';
			x.vars = {};
			Glue.attachPlugin( x, GlueEval );
			Glue.attachPlugin( x, GluePlatform );
			Glue.setPlatformExecCallback( x, Glue.run );    // default
		  return true;
    },
		
		attachPlugin: function( x, p, px ) {
				for( var i = 0; i < x.plugins.length; i++ ) {
					if( x.plugins[i][0] == p ) {
						return;
					}
				}
				x.plugins.push( [p, px] );
				p['glueAttach'].call( this, px, x );
			},
		
		setStdOut: function( f ) {
				Glue.stdout = f;
			},
			
		setExitHandler: function( f ) {
				Glue.exitHandler = f;
			},
		
		setRedirectLabel: function( x, s_lbl ) {
		  x["resume_label"] = s_lbl;
		  return Glue.PLUGIN_INLINE_REDIRECT;   // return this from your call to redirect
		},
		
		echo: function( s ) {
				if( Glue.stdout !== null ) {
					Glue.stdout.call( this, s );
				} else {
					if( console && console.log ) {
						console.log( s );
					} else {
						window.alert( s );
					}
				}
			},

		echoInfo: function() {
				Glue.echo( (Glue.getInfo() + '\n') );
			},
			
		getInfo: function() {
				return ('Glue v' + Glue.VERSION + ' [js]\n(c)2013-15 by Cylexia\n');
			},
			
		setPlatformExecCallback: function( o_glue, f_cb ) {
		  o_glue["exec.callback"] = f_cb;
		},

		load: function( x, script, vars ) {
				if( (vars !== null) && (typeof( vars ) == 'object' ) ) {
					x.vars = vars;
				} else {
					x.vars = {};
				}
				var e, s = 0, line, cmp = [], row, labels = {};
				if( script.startsWith( "<" ) ) {
				  s = (script.indexOf( ">" ) + 1);
				}
				script += "\n";
				while( (e = script.indexOf( "\n", s )) > -1 ) {
				  line = script.substr( s, (e - s) ).trim();
				  s = (e + 1);
				  // if it's empty, skip it
				  if( (line.length === 0) || (line.startsWith( "#" )) ) {
				    continue;
				  }
				  // if it's a label store the location and skip
				  if( line.startsWith( ":" ) ) {
				    labels[line] = cmp.length;
				    continue;
				  }
				  row = { "conditions": [] };
				  // any if terms?
				  var eb;
					while( line.charCodeAt( 0 ) == 40 ) {     // (
						eb = line.indexOf( ')' );
						row["conditions"].push( line.substr( 1, (eb - 1) ) );
						line = line.substr( (eb + 1) ).trim();
					}
					// for code tinyness it's possible to have conditions but no command so skip if so
					if( line.length === 0 ) {
					  continue;
					}
				  // pre-parse the command
				  var cmpline = Glue._preParse( line );
				  if( cmpline === null ) {
				    return false;
				  }
				  row["command"] = cmpline;
				  cmp.push( row );
				}
				x["script.lines"]= cmp;
				x["script.labels"] = labels;
				return true;
			},
			
		run: function( x, startlbl ) {
				var lines = x["script.lines"];
				var labels = x["script.labels"];
				var vars = x.vars;
				var label = '', gss = [], ts = '', runline, eb, slidx = 0;
				var i, l;
				if( startlbl ) {
					label = startlbl;
					if( label.charAt( 0 ) != ':' ) {
						label = (':' + label);
					}
					if( (i = label.indexOf( "#" )) > -1 ) {
						vars["_LABEL"] = label.substr( (i + 1) );
						label = label.substr( 0, i );
					}
				}
				var timeout = 1000;       // this many operations before the script is stopped
				for( i = slidx, l = lines.length; i < l; i++ ) {
				  if( timeout-- < 0 ) {
				    Glue._error( "[Glue] Instruction execution limit reached\n" );
				    return 0;
				  }
				  if( label ) {
				    if( label in labels ) {
				      i = labels[label];
				    } else {
    					Glue._error( ('\n[Glue] Missing marker: ' + label + '\n') );
				      return 0;
				    }
				    label = "";
				  }
					var line = lines[i]["command"], conds = lines[i]["conditions"], ci;
					runline = 1;
					if( conds && (conds.length > 0) ) {
					  for( ci = 0; ci < conds.length; ci++ ) {
					    if( !GlueEval._toBool( ((conds[ci] in vars) ? vars[conds[ci]] : '0') ) ) {
							  runline = 0;
							  break;
					    }
						}
					}
					if( runline == 1 ) {
						var w = Glue._parse( line, vars );
						if( w === false ) {
							Glue._error( '[Glue] Parser failed: ' + line.toString() );
							return false;
						}
						switch( w['_'] ) {
							case 'value': case '@': case 'put':
								vars[w.into] = w[w['_']];
								break;
							case 'get@':
								vars[w.into] = vars[w[w['_']]];
								break;
								
							case 'setpart':
								vars[w.into] = Glue._setPart( w['in'], w[w['_']], w['to'] );
								break;
							case 'getpart':
								vars[w.into] = Glue._getPart( w['from'], w[w['_']] );
								break;
							case 'getparts':
								vars[w.into] = Glue._getParts( w['from'], w[w._] );
								break;
								
							case 'echo': case 'print':
								Glue.echo( w[w['_']] );
								var k = '&';
								while( k in w ) {
									Glue.echo( w[k] );
									k += '&';
								}
								break;
							case 'stop':
								return 1;
								
							case 'gosub':
								gss.push( i );		// (the below comment stops the hinter from erroring)
								/* falls through */
							case 'goto':
								label = w[w['_']];
								if( (i = label.indexOf( "#" )) > -1 ) {
									vars["_LABEL"] = label.substr( (i + 1) );
									label = label.substr( 0, i );
								}
								if( label === "" ) {
								  Glue._error( ("\n[Glue] Marker cannot be blank in " + w['_']) );
								  return 0;
								}
								i = -1;
								break;
							case 'return':
								if( gss.length === 0 ) {
									Glue._error( 'RETURN stack is empty' );
									return 0;
								} else {
									i = gss.pop();
								}
								break;
							case 'while':	if( w['while'] == (('is' in w) ? w['is'] : '1') ) { label = w['goto']; i = -1; } break;
							case 'until':	if( w['until'] != (('is' in w) ? w['is'] : '1') ) { label = w['goto']; i = -1; } break;
							case '+++':
								// interactive mode is not available, set a breakpoint here to debug in browser
								Glue.echo( 'Interactive Mode is unsupported' );
								break;
							case '': 		break;
							default:
								var handled = false;
								for( var pi = 0, pl = x.plugins.length; pi < pl; pi++ ) {
									var r = x.plugins[pi][0]['glueCommand'].call( x.plugins[pi][1], x, w, vars );
									if( r == Glue.PLUGIN_DONE ) {			// 1: handled
										handled = true;
										break;
									} else if( r == Glue.PLUGIN_NOT_MINE ) {	// -1: not this plugin's
										//
									} else if( r == Glue.PLUGIN_INLINE_REDIRECT ) {	// -2: wants redirect to label
									  label = x["resume_label"];
									  x["resume_label"] = "";
									  if( !label ) {
										  label = vars['__cont'];
										  Glue.echo( "[Glue]: __cont is depreciated, contact your vendor\n" );
									  }
    								if( label === "" ) {
    								  Glue._error( ("\n[Glue] Marker cannot be blank in " + w['_']) );
    								  return 0;
    								}
										i = -1;
										handled = true;
										break;
									} else if( r == Glue.PLUGIN_DONE_STOP_OK ) {	// -3: plugin wants intepreter to stop as though "stop" was encountered (ie. normally)
										return true;
									} else if( r == Glue.PLUGIN_DONE_EXIT_ALL ) {	// -254: plugin requests intepreter to exit
										if( Glue.exitHandler ) {
											Glue.exitHandler.call( this, x );
										}
										return -254;
									} else if ( r < -128 ) {
										return r;
									} else {				// r = 0, error
										Glue._error( ('\n[Glue] Error in command: ' + w['_'] + '\n') );
										return false;
									}
								}
								if( !handled ) {
									Glue._error( ('\n[Glue] Invalid command: ' + w['_'] + '\n') );
									return false;
								}
  							break;
						}
					}
				}
				return true;
			},
		
		_preParse: function( a ) {
				// parse a sentence type string (eg key value key "value"...).  Separators are in $b
				var i, c, r = {};
				if( (i = a.indexOf( ' ' )) > -1 ) {
					var k, s = '';
					c = a.substr( 0, i++ );
					if( a.charAt( i ) == '=' ) {
						r['into'] = [ 0, c ];
						k = '';
						i += 2;
					} else {
						k = c.toLowerCase();
						r['_'] = [ 0, k ];
					}
					var l = a.length, e;
					//console.log( 'Entering parser loop with: ' + a + ' (len ' + l + ')' );
					for( ; i <= l; i++ ) {
						c = ((i < l) ? a.charAt( i ) : ' ');
						if( c == '"' ) {
							if( (e = a.indexOf( '"', ++i )) > -1 ) {
								r[k] = [ 0, Glue._unescape( a.substr( i, (e - i) ) ) ];
								i = e;
								k = s = '';
							} else {
								return false;
							}
						} else if( (c == ',') || (c == ';') ) {
							// ignored
						} else if( c == '~' ) {
							s = '';
						} else if( c == ' ' ) {
							if( k === '' ) {
								k = s.toLowerCase();
								if( k == '=>' ) {
									k = 'into';
								}
								if( !('_' in r) ) {
									r['_'] = [ 0, k ];
								}
							} else {
								if( (s === '') || ('+-0123456789:'.indexOf( s.charAt( 0 ) ) > -1) ) {
									r[k] = [ 0, s ];   // constant
								} else {
									r[k] = [ 1, s ];   // variable
								}
								k = '';
							}
							s = '';
						} else {
							s += c;
						}
					}
					if( (k !== '') && !(k in r) ) {
						r[k] = [ 0, '' ];
					}
				} else {
					r['_'] = [ 0, a.toLowerCase() ];
					r[a] = [ 0, '' ];
				}
				return r;
			},
		
		_parse: function( a, vars ) {
		    // a is precompiled
		    var op = {}, v;
		    for( var k in a ) {
		      v = a[k];
		      switch( v[0] ) {
		        case 0:
		          op[k] = v[1];
		          break;
		        case 1:
		          op[k] = (vars[v[1]] ? vars[v[1]] : "");
		          break;
		      }
		    }
		    return op;
		  },
		
		_unescape: function( s ) {
				var i = s.indexOf( '\\' );
				if( i == -1 ) {
					return s;
				}
				var r = s.substr( 0, i ), l = s.length;
				for( ; i < l; i++ ) {
					var c = s.charAt( i );
					if( c == '\\' ) {
						switch( s.charAt( ++i ) ) {
							case 'n': r += '\n'; break;
							case 'r': r += '\r'; break;
							case 't': r += '\t'; break;
							case 'q': r += '"'; break;
							case '\\': r += '\\'; break;
						}
					} else {
						r += c;
					}
				}
				return r;
			},
			
		_error: function( m ) {
				if( console && console.log ) {
					console.log( m );
				}
				Glue.echo( m );
			},
			
			
		arrayToParts: function( a ) {
				var d = '';
				for( var i = 0; i < a.length; i++ ) {
					d = Glue._setPart( d, i, a[i] );    // int->string is done in _setPart
				}
				d = Glue._setPart( d, 'count', a.length );
				return d;
			},
			
		dictToParts: function( s ) {
				var d = '';
				for( var k in s ) {
					d = Glue._setPart( d, k, s[k] );
				}
				return d;
			},
			
		partsToDict: function( d ) {
				var res = {}, ofs = 0, k = "";
				while( ofs < d.length ) {
					var rl = 0;
					var o = d.charCodeAt( ofs );
					ofs++;
					while( o >= 97 ) {
						rl = (rl + ((o - 97) << 4));
						o = d.charCodeAt( ofs );
						ofs++;
					}
					rl += (o - 65);
					o = ofs;
					ofs += rl;
					if( k === '' ) {
						k = d.substr( o, rl );
					} else {
						res[k] = d.substr( o, rl );
						k = '';
					}
				}
				return res;
			},
			
		_setPart: function( d, sk, sv ) {
				return Glue._part( d, sk.toString(), sv.toString(), 1 );
			},
			
    _getPart: function( from, gk ) {
			return Glue._part( from, gk.toString(), 0, 0 );
		},
			
		_getParts: function( d, ks ) {
				var s = 0, e, k, z = '';
				while( (e = ks.indexOf( ',', s )) > -1 ) {
					k = ks.substr( s, (e - s) );
					z = Glue._setPart( z, k, Glue._getPart( d, k ) );
					s = (e + 1);
				}
				k = ks.substr( s );
				if( k !== '' ) {
					z = Glue._setPart( z, k, Glue._getPart( d, k ) );
				}
				return z;
			},
		
		_part: function( d, sk, sv, upd ) {
				var ofs = 0, m = 0, rstart;
				var k = "", s = k, result = "";
				d = (d ? d : '');
				while( ofs < d.length ) {
					var rl = 0;
					var o = d.charCodeAt( ofs );
					rstart = ofs;
					ofs++;
					while( o >= 97 ) {
						rl = (rl + ((o - 97) << 4));
						o = d.charCodeAt( ofs );
						ofs++;
					}
					rl += (o - 65);
					o = ofs;
					ofs += rl;
					if( m === 0 ) {
						k = d.substr( o, rl );
						if( k == sk ) {
							m = 2;   // set: don't write the key and value back, we will add at the end. get: key matches
						} else if( upd == 1 ) {
							result += d.substr( rstart, (rl + (o - rstart)) );
							m = 1;   // set: write the key and value, get: X
						} else {
							m = 3;	// read and discard the next value
						}
					} else {
						if( m == 1 ) {
							result += d.substr( rstart, (rl + (o - rstart)) );	// set: update, get: X
						} else if( (m == 2) && !upd ) {
							return d.substr( o, rl );							// set: X, get: key matches, return value
						}
						m = 0;
					}
				}
				if( upd == 1 ) {
					s = sk;			// set: write key and value, get: X
					for( var i = 0; i < 2; i++ ) {
						var l = s.length;
						var z = String.fromCharCode( (65 + (l & 15)) );
						while( l > 15 ) {
							l = (l >> 4);
							z = (String.fromCharCode( (97 + (l & 15)) ) + z);
						}
						result += z;
						result += s;
						s = sv;
					}
				}
				return result;
			}
	};

var GlueEval = {
		init: function() {},
		
		glueAttach: function( x, gluex ) {
				// ignore glue instance as this is entirely static
				return 1;
			},
		
		glueCommand: function( glue, w, vars ) {
				// no binary operators are supported in eval - provide a "bitwise" command with a plugin if needed
				var v = w[w["_"]];
				switch( w['_'] ) {
					case "increase": case "incr":
						vars[w.into] = (GlueEval._toNum( v ) + GlueEval._toNum( w['by'] )).toString();
						break;
					case "decrease": case "decr":
						vars[w.into] = (GlueEval._toNum( v ) - GlueEval._toNum( w['by'] )).toString();
						break;
					case "divide":
						vars[w.into] = (GlueEval._toNum( v ) / GlueEval._toNum( w['by'] )).toString();
						break;
					case "multiply":
						vars[w.into] = (GlueEval._toNum( v ) * GlueEval._toNum( w['by'] )).toString();
						break;
					case "moddiv":
						vars[w.into] = (GlueEval._toNum( v ) % GlueEval._toNum( w['by'] )).toString();
						break;
					case "join":
						var k = "&";
						while( k in w ) {
							v += GlueEval._toString( w[k] );
							k += "&";
						}
						vars[w.into] = v;
						break;
					
					case "cutleftof": case "croprightoffof":
						vars[w.into] = v.substr( 0, w["at"] );
						break;
					case "cutrightof": case "cropleftoffof":
						vars[w.into] = v.substr( w["at"] );
						break;
					case "findindexof":	//"findstring":
						if( ("ignorecase" in w) && GlueEval._toBool( w["ignorecase"] ) ) {
							vars[w.into] = w["in"].toLowerCase().indexOf( v.toLowerCase() );
						} else {
							vars[w.into] = w["in"].indexOf( v );
						}
						break;
					case "getlengthof":
						vars[w.into] = v.length.toString();
						break;

					case 'test': case 'testif':
						v = w[w._];
						var r = false;
						if( 'is' in w ) {
							r = (v.toString() == w['is'].toString());		// string comparison
						} else if( 'isnot' in w ) {
							r = (v.toString() != w['isnot'].toString());	// string comparison
						} else {
							// coerce values to int for all other operations
							v = parseInt( v );
							if( '!=' in w ) {
								r = (v != parseInt( w['!='] ));
							} else if( '==' in w ) {
								r = (v == parseInt( w['=='] ));
							} else if( '=' in w ) {
								r = (v == parseInt( w['='] ));
							} else if( '<>' in w ) {
								r = (v != parseInt( w['<>'] ));
							} else if( '<' in w ) {
								r = (v < parseInt( w['<'] ));
							} else if( '>' in w ) {
								r = (v > parseInt( w['>'] ));
							} else if( '<=' in w ) {
								r = (v <= parseInt( w['<='] ));
							} else if( '>=' in w ) {
								r = (v >= parseInt( w['>='] ));
							} else if( 'lt' in w ) {
								r = (v < parseInt( w['lt'] ));
							} else if( 'gt' in w ) {
								r = (v > parseInt( w['gt'] ));
							} else if( 'lte' in w ) {
								r = (v <= parseInt( w['lte'] ));
							} else if( 'gte' in w ) {
								r = (v >= parseInt( w['gte'] ));
							} else if( 'and' in w ) {
								r = (((v === 0) ? 0 : 1) && ((GlueEval._toBool( w['and'] ) === 0) ? 0 : 1));
							} else if( 'or' in w ) {
								r = (((v === 0) ? 0 : 1) || ((GlueEval._toBool( w['or'] ) === 0) ? 0 : 1));
							}
						}
						vars[w.into] = (r ? '1' : '0');
						break;
					case 'not':
						// if value is anything other than 0 return 1 else return 0
						// default boolean is 0 is false, anything else is true
						vars[w.into] = ((GlueEval._toBool( w['not'] ) === false) ? '1' : '0');
						break;
					default:
						return -1;		// not ours
				}
				return 1;
			},
			
			_toNum: function( v ) {
					v = parseFloat( v );
					if( isNaN( v ) ) {
						return 0;
					}
					return v;
				},
				
			_toString: function( v ) {
			  if( v === 0 ) {
			    return "0";
			  } else {
			    return v.toString();
			  }
			},
			
			// anything not "" or 0 is true.
			_toBool: function( v ) {
			  if( v === "" ) {
			    return false;
			  }
			  var b = parseInt( v );
			  if( isNaN( b ) ) {
			    return true;
			  } else if( b !== 0 ) {
			    return true;
			  }
			  return false;
			}
	};

	var GluePlatform = {
			glueAttach: function( x, gluex ) {
					// self-contained so x will be null and gluex is ignored
					return 1;
				},
			
			glueCommand: function( glue, w, vars ) {
					var c = w._;
					if( c.substr( 0, 9 ) == 'platform.' ) {
						var vc = w[c], temp;
						switch( c.substr( 9 ) ) {
							case 'pause':
								Glue.echo( '[PLATFORM] pause is unsupported' );
								break;
							
							case 'listfilesin':
								temp = GlueFileManager.listFiles( vc );
								if( temp !== null ) {
									vars[w.into] = Glue.arrayToParts( temp );
								} else {
									vars[w.into] = '';
								}
								break;
								
							case 'readfromfile':
							  temp = GlueFileManager.readText( vc );
							  if( temp !== null ) {
								  vars[w.into] = temp;
								} else {
									Glue.echo( ('[PLATFORM] unable to read from: ' + vc) );
								}
								break;
								
							case 'writetofile':
								temp = GlueFileManager.writeText( vc, w.value );
								if( "into" in w ) {
								  vars[w["into"]] = (temp ? "1" : "0");
								}
								if( !temp ) {
								  Glue.echo( ("[PLATFORM] Unable to write to: " + vc) );
								}
								break;
								
							case 'loadconfigfrom':
                temp = GlueFileManager.readText( vc );
							  if( temp !== null ) {
							    vars[w["into"]] = GluePlatform._loadConfig( temp );
								} else {
									Glue.echo( ('[PLATFORM] unable to read from: ' + vc) );
									return 0;
								}
								break;
								
							case 'getdateserial':
								vars[w.into] = GluePlatform._getDateSerial();
								break;
								
							case 'setenvironmentvariable':
								GluePlatform.setEnv( vc, w.to );
								break;
								
							case 'getenvironmentvariable':
								vars[w.into] = GluePlatform.getEnv( vc );
								break;
								
							case 'getrandomnumberfrom':
							  var from = Dict.intValueOf( w, w["_"] );
							  var upto = Dict.intValueOf( w, "upto" );
							  vars[w["into"]] = Math.floor((Math.random() * upto) + from);
						    break;
						    
							case 'exec':
								var ret = GluePlatform._exec(
								    glue,
								    vc,
								    Dict.valueOf( w, "withargs", Dict.valueOf( w, "args" ) ),
								    Dict.valueOf( w, "ondonegoto", Dict.valueOf( w, "onexitgoto" ) ),
								    Dict.valueOf( w, "onerrorgoto" )
								  );
								    
								if( ret ) {
								  return ret;
								} else {
									Glue.echo( ('[PLATFORM] Failed to exec: ' + vc + ' ' + w.withArgs) );
									return 0;
								}
								break;
							
							case 'browseto':
								GluePlatform._browseTo( glue, w );
								break;
							
							case 'getid':
							  if( GluePlatform._isChromeApp() ) {
								  vars[w.into] = 'js/chrome_app';
							  } else {
							    vars[w.into] = 'js';
							  }
								break;

							default:
								return 0;
						}
						return 1;
					}
					return -1;
				},
				
			setEnv: function( k, v ) {
			    // Chrome apps can only store data in the Glue object since storage is
			    //  async and we have no ability to use that
			    if( GluePlatform._isChromeApp() ) {
			      Glue[("envs." + k)] = v;
					} else if( localStorage ) {
						localStorage.setItem( k, v );
					} else {
						document.cookie = ('glue_env_' + GluePlatform._sToH( k ) + '=' + GluePlatform._sToH( v ) +
								'; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/'
							);
					}
				},
				
			getEnv: function( k ) {
			    // Chrome apps can only store data in the Glue object since storage is
			    //  async and we have no ability to use that
					var v;
			    if( GluePlatform._isChromeApp() ) {
			      k = ("envs." + k);
			      v = (Glue[k] ? Glue[k] : "");
					} else if( localStorage ) {
						v = localStorage.getItem( k );
					} else {
						v = GluePlatform._hToS( document.cookie[GluePlatform._hToS( k )] );
					}
					return v;
				},
				
			setExecApp: function( s_loadedfrom, s_id, o_app ) {
			  if( !window.glueApps ) {
			    window.glueApps = {};
				window.glueAppFiles = {};
			  }
			  window.glueApps[s_id] = o_app;
			  window.glueAppFiles[s_loadedfrom] = s_id;
			},
			
			isExecAppAvailable: function( s_id ) {
				if( !window.glueApps ) {
					return false;
				}
				if( window.glueApps[s_id] ) {
					return true;
				} else if( window.glueAppFiles[s_id] ) {
					return true;
				}
				return false;
			},
			
			// any app providing "exec" simulation should call this when it's done
			//  it allows registering custom "relauch" code
			// Default is just to call Glue.run() with the given frame and label
			execFinished: function( o_glue, s_label, o_this ) {
  		  if( !o_this ) {
  		    o_this = this;
  		  }
		  
		    o_glue["exec.callback"].call( o_this, o_glue, s_label );
  		},
			
			_isChromeApp: function() {
  			  return (window.chrome && chrome.app && chrome.app.runtime);
  			},
				
			_browseTo: function( gluex, w ) {
					var page = w[w["_"]];
					window.open( page );
					//Glue.run( gluex, w["ondonegoto"] );
				},

								
			_getDateSerial: function() {
					var d = new Date();
					var s =	d.getFullYear().toString();
					var p = [ (d.getMonth() + 1), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() ];
					for( var i = 0; i < p.length; i++ ) {
						s += (((p[i] < 10) ? '0' : '') + p[i].toString());
					}
					return s;
				},
			
			_hasFS: function() {
					if( window['GlueFS'] ) {
						return true;
					} else {
						Glue.echo( '[PLATFORM] GlueFS is not available.  Ignoring call\n' );
					}
					return false;
				},
				
			_loadConfig: function( src ) {
			    var op = "";
					var s = 0, e, k, v, i, prefix = "";
					src += "\n";
					while( (e = src.indexOf( '\n', s )) > -1 ) {
						var line = src.substr( s, (e - s) ).trim();
						if( (line.charAt( 0 ) == '[') && (line.charAt( (line.length - 1) ) == ']') ) {
							prefix = (line.substr( 1, (line.length - 2) ) + ".");
						} else {
						  i = line.indexOf( "=" );
						  if( i > -1 ) {
							  op = Glue._setPart( op, (prefix + line.substr( 0, i ).trim()), line.substr( (i + 1) ).trim() );
						  }
						}
						s = (e + 1);
					}
					return op;
				},

			_exec: function( gluex, cmd, args, ondonegoto, onerrorgoto ) {
					if( window.glueApps ) {
						if( cmd in window.glueApps ) {
							var res = window.glueApps[cmd]['glueExec'].call( this, gluex, args, ondonegoto, onerrorgoto, args );
							if( res ) {
							  // return true if the function has done all the work and wants
							  //  signify that the exec call is complete - will redirect to
							  //  ondonegoto
							  Glue.setRedirectLabel( gluex, ondonegoto );
							  return Glue.PLUGIN_INLINE_REDIRECT;
							} else {
							  // return false if the function is doing something asynchronously,
							  //  in this case it'll stop the script with OK then wait for a
							  //  call to GluePlatform.execFinished() to continue
  							return Glue.PLUGIN_DONE_STOP_OK;
							}
						}
					}
					// if the app doesn't exist we go to the error handler (if one is set,
					//  if not, we fail the script)
					if( onerrorgoto ) {
						  Glue.setRedirectLabel( gluex, onerrorgoto );
						  return Glue.PLUGIN_INLINE_REDIRECT;
					} else {
					  // no error handler, we fail the script
					  return 0;
					}
				},
						
			_sToH: function( a ) {
					var z = '', cc;
					for( var i = 0; i < a.length; i++ ) {
						cc = String.valueOf( a.charCodeAt( i ) );
						z += (cc.length + cc);
					}
					return z;
				},
				
			_hToS: function( a ) {
  			  if( !a ) {
  			    return "";
  			  }
  				var z = '', c, i, l = a.length;
  				while( i < l ) {
  					l = parseInt( a.charAt( i++ ) );
  					c = a.substr( i, l );
  					z += String.fromCharCode( c );
  					i += l;
  				}
  				return z;
			  }
		};
	

var GlueFileManager = {
  _inited: false,
  _providers: null,
  _int_fs: {},    // provides a way to store additional data
  _int_fs_root: '',
  
  init: function( s_fs_root ) {
	  "use strict";
    if( !GlueFileManager._inited ) {
      GlueFileManager._providers = [];
      GlueFileManager._int_fs_root = (s_fs_root ? s_fs_root : 'fs/');   // default root for files is "fs" subdir
      GlueFileManager.addProvider( GlueFileManager );     // default file manager is this
      GlueFileManager._inited = true;
    }
    return true;
  },
  
  addProvider: function( o_provider ) {
    GlueFileManager._providers.push( o_provider );
  },
  
  listFiles: function( s_path, x_data ) {
    var r, a = [];
    for( var i = 0; i < GlueFileManager._providers.length; i++ ) {
      r = GlueFileManager._providers[i].gfmListFiles( s_path, x_data );
      if( r !== null ) {
        for( var fidx = 0; fidx < r.length; fidx++ ) {
          a.push( r[fidx] );
        }
      }
    }
    return a;
  },
  
  readText: function( s_id, x_data ) {
    var r;
    for( var i = 0; i < GlueFileManager._providers.length; i++ ) {
      r = GlueFileManager._providers[i].gfmReadText( s_id, x_data );
      if( r !== null ) {
        return r;
      }
    }
    return null;
  },
  
  readBinary: function( s_id, x_data ) {
    var r;
    for( var i = 0; i < GlueFileManager._providers.length; i++ ) {
      r = GlueFileManager._providers[i].gfmReadBinary( s_id, x_data );
      if( r !== null ) {
        return r;
      }
    }
    return null;
  },

  writeText: function( s_id, s_value, x_data ) {
    var r;
    for( var i = 0; i < GlueFileManager._providers.length; i++ ) {
      r = GlueFileManager._providers[i].gfmWriteText( s_id, s_value, x_data );
      if( r ) {
        return true;
      }
    }
    return false;
  },
  
  writeBinary: function( s_id, x_value, x_data ) {
    var r;
    for( var i = 0; i < GlueFileManager._providers.length; i++ ) {
      r = GlueFileManager._providers[i].gfmWriteBinary( s_id, x_value, x_data );
      if( r ) {
        return true;
      }
    }
    return null;
  },

  
  // implementation of a default manager
  setResource: function( s_id, s_data, b_binary ) {
    // note: this adds text as a string and binary (images only) as "img" elements.
    var e;
    if( b_binary ) {
      e = document.createElement( "img" );
      e.src = s_data;
      GlueFileManager._int_fs[s_id] = e;
    } else {
      GlueFileManager._int_fs[s_id] = s_data;
    }
    return true;
  },
  
  getResource: function( s_id ) {
    if( s_id in GlueFileManager._int_fs ) {
      return GlueFileManager._int_fs;
    } else {
      return null;
    }
  },
  
  // NOTE: this is not syncronous - it happens once the current execution stops
  // use it to pre-cache files.  Ideally, reference the scripts in the HTML
  loadResource: function( s_id ) {
    var s = document.createElement( "script" );
    s.src = (GlueFileManager._int_fs_root + s_id + ".js");
    // if the script is added it must call GlueFileManager.setResource()
    document.getElementsByTagName( "head" )[0].appendChild( s );
  },
  
  loadResources: function( a_ids ) {
    for( var i = 0; i < a_ids.length; i++ ) {
      GlueFileManager.loadResource( s_id );
    }
  },
  
  setLocalRoot: function( s_root ) {
    GlueFileManager._int_fs_root = s_fs_root;
  },
  
  getLocalRoot: function() {
    return GlueFileManager._int_fs_root;
  },
  
  gfmListFiles: function( s_path, x_data ) {
    var els = document.getElementsByTagName( "textarea" );
    var files = [];
    for( var i = 0; i < els.length; i++ ) {
      if( els[i].className == "gfmfile" ) {
        files.push( els[i].id );
      } else if( els[i]["gluefilesystem.id"] ) {
        files.push( els[i]["gluefilesystem.id"] );
      }
    }
    for( var k in GlueFileManager._int_fs ) {
      files.push( k );
    }
    return files;
  },
  
  gfmReadText: function( s_id, x_data ) {
    if( s_id in GlueFileManager._int_fs ) {
      return GlueFileManager._int_fs[s_id];
    } else if( document.getElementById( s_id ) ) {
      return document.getElementById( s_id ).value;
    } else {
      var tas = document.getElementsByTagName( "textarea" );
      for( var i = 0; i < tas.length; i++ ) {
        if( tas[i]["gluefilesystem.id"] && (tas[i]["gluefilesystem.id"] == s_id) ) {
          return tas[i].value;
        }
      }
    }
    return null;
  },
  
  gfmReadBinary: function( s_id, x_data ) {
    // this only provides images and really only for canvases
    if( s_id in GlueFileManager._int_fs ) {
      return GlueFileManager._int_fs[s_id];
    } else if( document.getElementById( s_id ) ) {
      return document.getElementById( s_id );
    } else {
      var imgs = document.getElementsByTagName( "img" );
      for( var i = 0; i < imgs.length; i++ ) {
        if( imgs[i]["gluefilesystem.id"] && (imgs[i]["gluefilesystem.id"] == s_id) ) {
          return imgs[i];
        }
      }
    }
    return null;
  },
  
  gfmWriteText: function( s_id, s_value, x_data ) {
    // if we are the only provider we will allow temporary storage of data, if
    // we are not then we assume one of the others will do it
    if( GlueFileManager._providers.length == 1 ) {
      return GlueFileManager.setResource( s_id, s_value, false );
    }
    return false;
  },
  
  gfmWriteBinary: function( s_id, x_value, x_data ) {
    // unsupported
    return false;
  }
  
};
