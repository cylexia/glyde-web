// libcore - Core Function Library
//  (c)2010-2015 by Chris Dickens/Cylexia
//
//  Version: 1.15.0624
//
//  MIT License
//

var _ = {
  e: function( s_id ) { "use strict";
    return document.getElementById( s_id );
  },
  
  c: function( s_type, o_style, o_props ) { "use strict";
    var el = document.createElement( s_type );
    if( o_props ) {
      for( var k in o_props ) {
        el[k] = o_props[k];
      }
    }
    if( o_style ) {
      _.s( el, o_style );
    }
    return el;
  },
  
  s: function( o_el, o_style ) {
    for( var k in o_style ) {
      o_el.style[k] = o_style[k];
    }
    return o_el;
  },
  
  se: function( s_id, o_style ) {
    return _.s( _.e( s_id ), o_style );
  },
  
  a: function( o_el, o_el2 ) {
    o_el.appendChild( o_el2 );
    return o_el;
  },
  
  at: function( o_el, s_string ) {
    o_el.appendChild( document.createTextNode( s_string ) );
    return o_el;
  },

  r: function( o_el ) {
    while( o_el.firstChild ) {
      o_el.removeChild( o_el.firstChild );
    }
    return o_el;
  },
  
  rt: function( o_el, s_text ) {
    _.r( o_el );
    _.at( o_el, s_text );
  }
  
};

var Utils = {
  getDocumentArgs: function() {
    var args = {};
    if( document.location.search ) {
      var q = document.location.search;
      if( q.length > 0 ) {
        var s, e, b, p;
        if( q.charAt( 0 ) == "?" ) {
          s = 1;
        } else {
          s = 0;
        }
        q += "&";
        while( (e = q.indexOf( "&", s)) > -1 ) {
          p = q.substr( s, (e - s) );
          if( (b = p.indexOf( "=" )) > -1 ) {
            args[p.substr( 0, b )] = decodeURIComponent( p.substr( (b + 1) ) ) ;
          }
          s = (e + 1);
        }
      }
    }
    return args;
  },
  
  parseSimpleConfig: function( s_src ) {    // as Dict
		var e, s = 0;
		var key, value, op = Dict.create();
		while( (e = s_src.indexOf( ";", s )) > -1 ) {
		  var line = s_src.substr( s, (e - s) ).trim();
		  s = (e + 1);
			e = line.indexOf( "=" );
			if( (e > -1) && (line.length > 0) && (line.charAt( 0 ) != "#") ) {
				key = line.substring( 0, e );
				value = line.substring( (e + 1) );
				if( Dict.containsKey( op, key ) ) {
			    value = (Dict.valueOf( op, key ) + "\n" + value);
				}
				Dict.set( op, key, value );
			}
		}
		return op;
  },
  
  split: function( s_src, s_div ) {
    if( !s_src ) {
      return [];
    }
		var e, s = 0, l = s_div.length;
		var key, value, op = [];
		while( (e = s_src.indexOf( s_div, s )) > -1 ) {
		  op.push( s_src.substr( s, (e - s) ) );
		  s = (e + l);
		}
		op.push( s_src.substr( s ) );   // the last element
		return op;
  },
  
  isTrueString: function( s_str ) {
    s_str = s_str.toLowerCase();
    return ((s_str == "1") || (s_str == "yes") || (s_str == "on") || (s_str == "enabled") || (s_str == "true"));
  }
  
};

var Dict = {
  create: function() {
    return {};
  },
  
  createFromDict: function( d_dict ) {
    var n = {};
    for( var k in d_dict ) {
      n[k] = d_dict[k];
    }
    return n;
  },
  
  createFromDictBranch: function( d_dict, s_prefix ) {
    var l = s_prefix.length;
    var o = Dict.create();
    for( var k in d_dict ) {
      if( k.substr( 0, l ) == s_prefix ) {
        Dict.set( o, k.substr( l ), Dict.valueOf( d_dict, k ) );
      }
    }
    return o;
  },
  
  load: function( d_dict, m_map ) {
    for( var k in m_map ) {
      Dict.set( d_dict, k, m_map[k] );
    }
    return d_dict;
  },
  
  keys: function( d_dict ) {
    var ks = [];
    for( var k in d_dict ) {
      ks.push( k );
    }
    return ks;
  },
  
  values: function( d_dict ) {
    var vs = [];
    for( var k in d_dict ) {
      vs.push( d_dict[k] );
    }
    return vs;
  },
  
  delete: function( d_dict ) {
    return true;
  },
  
  // Frame value/key functions
  set: function( d_dict, s_k, s_v ) {
    d_dict[s_k] = s_v;
  },
  
  valueOf: function( d_dict, s_k, s_d ) {
    if( s_k in d_dict ) {
      return d_dict[s_k];
    } else {
      return (s_d ? s_d : "");
    }
  },
  
  intValueOf: function( d_dict, s_k, s_d ) {
    var n;
    if( s_k in d_dict ) {
      n = parseInt( d_dict[s_k] );
    } else {
      n = (s_d ? s_d : 0);
    }
    if( isNaN( n ) ) {
      return 0;
    }
    return n;
  },
  
  dictValueOf: function( d_dict, s_k, s_d ) {
    if( s_k in d_dict ) {
      return d_dict[s_k];
    } else {
      if( s_d ) {
        return s_d;
      } else {
        return {};
      }
    }
  },
  
  unset: function( d_dict, s_k ) {
    if( s_k in d_dict ) {
      delete d_dict[s_k];
      return true;
    }
  },
  
  containsKey: function( d_dict, s_k ) {
    return (s_k in d_dict);
  }
};