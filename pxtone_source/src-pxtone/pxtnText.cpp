// '12/03/03


#include <string.h>
#include <stdlib.h>

#include "./pxtnText.h"


static bool _set( char **pp, const char *p )
{
	if( !p || !pp ) return false;
	if( *pp ){ free( *pp ); *pp = NULL; }

	int len = strlen( p );
	if( len <= 0 ) return false;

	if( !( *pp = (char *)malloc( len + 1 ) ) ) return false;
	memset( *pp, 0, len + 1 );
	strcpy( *pp, p );

	return true;
}

static bool _read4_malloc( char **pp, pxwrDoc *p_doc )
{
	long size    = 0;
	char *p_text = NULL;

	if( !pp ) return false;

	if( !p_doc->r( &size, 4, 1 ) ) return false;
	if( !size ) return _set( pp, "" );

	p_text = (char *)malloc( size + 1 );
	if( !p_text )
	{
		return false;
	}
	else
	{
		memset( p_text, 0, size + 1 );
		if( !p_doc->r( p_text, sizeof(char), size ) )
		{
			free( p_text );
			return false;
		}
		if( !_set( pp, p_text ) )
		{
			free( p_text );
			return false;
		}
	}
	free( p_text );

	return true;
}

static bool _write4( const char *p, pxwrDoc *p_doc )
{
	long size = 0;
	size = strlen( p );
	if( !p_doc->w( &size, 4,    1 ) ) return false;
	if( !p_doc->w(  p,    1, size ) ) return false;
	return true;
}

bool        pxtnText::set_comment( const char *p_comment )
{
	return _set( &_p_comment, p_comment );
}
const char *pxtnText::get_comment( void ) const
{
	return _p_comment; }
bool        pxtnText::set_name   (  const char *p_name   )
{
	return _set( &_p_name,    p_name    );
}
const char *pxtnText::get_name   ( void ) const{ return _p_name;    }

pxtnText::pxtnText()
{
	_p_comment = NULL;
	_p_name    = NULL;
}

pxtnText::~pxtnText()
{
	if( _p_comment ){ free( _p_comment ); _p_comment = NULL; }
	if( _p_name    ){ free( _p_name    ); _p_name    = NULL; }
}


bool pxtnText::Comment_w( pxwrDoc *p_doc )
{
	if( !_p_comment ) return false;
	return _write4( _p_comment, p_doc );
}

bool pxtnText::Name_w( pxwrDoc *p_doc )
{
	if( !_p_name ) return false;
	return _write4( _p_name, p_doc );
}

bool pxtnText::Comment_r(  pxwrDoc *p_doc )
{
	char *p    = NULL ;
	bool b_ret = false;

	if( !_read4_malloc( &p, p_doc ) ) return false;
	b_ret = set_comment( p );
	free( p );

	return b_ret;
}


bool pxtnText::Name_r(  pxwrDoc *p_doc )
{
	char *p    = NULL ;
	bool b_ret = false;

	if( !_read4_malloc( &p, p_doc ) ) return false;
	b_ret = set_name( p );
	free( p );

	return b_ret;
}