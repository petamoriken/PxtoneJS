//  Emscripten Support by printf_moriken '15/12/02
//  pxwrDoc.cpp '11/08/12.

//#include <StdAfx.h>

#ifdef _WIN32
#else 
#include <stdio.h>
#include <string.h>
#include <stdarg.h>
#endif

#include "./pxwrDoc.h"

/*
#ifdef _WIN32

#include "./pxw/pxwFile.h"

#else

#include "./pxm/pxmFile.h"

#endif
*/

pxwrDoc::pxwrDoc()
{
	_p      = NULL ;
	_len    =     0;
	_b_file = false;
	_ofs    =     0;
}

pxwrDoc::~pxwrDoc()
{
	if( _b_file && _p ) fclose( (FILE*)_p );
}

/*
pxwrDoc::pxwrDoc( const char *dir, const char *name, const char* mode )
{
	_fp = NULL;
	
	Open( dir, name, mode );
}
*/

int pxwrDoc::FileSize() const { return _len; }

/*
void pxwrDoc::Delete_res( const char *dir, const char *name ) const
{
#ifdef _WIN32
	pxwFile_Document_Delete( dir, name );
#else

#endif
}

bool pxwrDoc::Open_res( const char *dir, const char *name, const char* mode, bool b_resource )
{
	bool b_ret = false;
	
#ifdef _WIN32
	_p = (char*)pxwFile_Document_Open( dir, name, mode, &_len );
#else
	if( b_resource ) _p = (char*)pxmFile_Resource_Open( dir, name, mode, &_len );
	else             _p = (char*)pxmFile_Document_Open( dir, name, mode, &_len );
#endif
	
	if( !_p ) goto End;

	_ofs    =    0;
	_b_file = true;
	b_ret   = true;
End:
	return b_ret;
}

bool pxwrDoc::Open_path( const char *path, const char* mode )
{
	bool b_ret = false;
	
#ifdef _WIN32
	_p = (char*)pxwFile_Document_Open( path, mode, &_len );
#else
	goto End;
#endif
	
	if( !_p ) goto End;

	_ofs    =    0;
	_b_file = true;
	b_ret   = true;
End:
	return b_ret;
}

*/

/*
win32resource or file( HMODULE hModule, const char *type_name, const char *file_name )
{
	pxwrDoc doc;

	if( !type_name )
	{
		if( !doc.Open_path( file_name, "rb" ) ) return false;
	}
	else
	{
		HRSRC   hResource;
		HGLOBAL hGlobal;
		hResource     = FindResource(   hModule, file_name, type_name );
		int len       = SizeofResource( hModule, hResource );           
		hGlobal       = LoadResource(   hModule, hResource );           
		void *p       = (unsigned char *)LockResource( hGlobal );       
		if( !doc.SetRead( p, len ) ) return false;
	}
}
*/

bool pxwrDoc::SetRead( void *p, int len )
{
	if( !p || len < 1 ) return false;

	_p      = (char*)p;
	_len    = len  ;
	_b_file = false;
	_ofs    =     0;

	return true;
}

bool pxwrDoc::Seek   ( int mode, int val )
{
	if( _b_file )
	{
		int seek_tbl[ pxwrSEEK_num ] = {SEEK_SET, SEEK_CUR, SEEK_END};
		if( fseek( (FILE*)_p, val, seek_tbl[ mode ] ) ) return false;
	}
	else
	{
		switch( mode )
		{
		case pxwrSEEK_set:
			if( val >= _len       ) return false;
			if( val <  0          ) return false;
			_ofs = val;
			break;
		case pxwrSEEK_cur:
			if( _ofs + val >= _len ) return false;
			if( _ofs + val <  0    ) return false;
			_ofs += val;
			break;
		case pxwrSEEK_end:
			if( _len + val >= _len ) return false;
			if( _len + val <  0    ) return false;
			_ofs = _len + val;
			break;
		}
	}

	return true;
}


void pxwrDoc::Close()
{
	if( _b_file && _p ) fclose( (FILE*)_p );

	_p      = NULL ;
	_b_file = false;
	_len    = false;
	_ofs    =     0;
}

bool pxwrDoc::w( const void *p, int size, int num )
{
	bool b_ret = false;

	if( !_p || !_b_file ) goto End;
	
	if( fwrite( p, size, num, (FILE*)_p ) != num ) goto End;
	
	b_ret = true;
End:
	return b_ret;
}

bool pxwrDoc::w_arg( const char *fmt, ... )
{
	bool b_ret = false;
	char str[ 1024 ];
	int  len;

	if( !_p || !_b_file ) goto End;

	va_list ap; va_start( ap, fmt ); vsprintf( str, fmt, ap ); va_end( ap );

	len = strlen( str );
	if( fwrite( str, 1, len, (FILE*)_p ) != len ) goto End;
	
	b_ret = true;
End:
	return b_ret;
}


bool pxwrDoc::r(       void *p, int size, int num )
{
	if( !_p ) return false;

	bool b_ret = false;

	if( _b_file )
	{
		if( fread( p, size, num, (FILE*)_p ) != num ) goto End;
	}
	else
	{
		for( int  i = 0; i < num; i++ )
		{
			if( _ofs + size > _len ) goto End;
			memcpy( &((char*)p)[ i ], &_p[ _ofs ], size );
			_ofs += size;
		}
	}
	
	b_ret = true;
End:
	return b_ret;
}


int  pxwrDoc_v_chk( int val )
{
	unsigned int  us;

	us = (unsigned int )val;
	// 1byte(7bit)
	if( us <        0x80 ) return 1;
	// 2byte(14bit)
	if( us <      0x4000 ) return 2;
	// 3byte(21bit)
	if( us <    0x200000 ) return 3;
	// 4byte(28bit)
	if( us <  0x10000000 ) return 4;
	// 5byte(35bit)
//	if( value < 0x800000000 ) return 5;
	if( us <= 0xffffffff ) return 5;

	return 6;
}



// ..unsigned int
int  pxwrDoc::v_w  ( int val, int *p_add )
{
	if( !_p ) return 0;
	if( !_b_file ) return 0;

	unsigned char a[ 5 ];
	unsigned char b[ 5 ];
	unsigned int  us;

	us = (unsigned int )val;
	
	a[ 0 ] = *( (unsigned char *)(&us) + 0 );
	a[ 1 ] = *( (unsigned char *)(&us) + 1 );
	a[ 2 ] = *( (unsigned char *)(&us) + 2 );
	a[ 3 ] = *( (unsigned char *)(&us) + 3 );
	a[ 4 ] = 0;

	// 1byte(7bit)
	if( us < 0x80 )
	{
		if( fwrite( &a[0], 1, 1, (FILE*)_p ) != 1 ) return false;
		if( p_add ) *p_add += 1;
		return true;
	}

	// 2byte(14bit)
	if( us < 0x4000 )
	{
		b[0] =             ((a[0]<<0)&0x7F) | 0x80;
		b[1] = (a[0]>>7) | ((a[1]<<1)&0x7F);
		if( fwrite( b, 1, 2, (FILE*)_p )     != 2 ) return false;
		if( p_add ) *p_add += 2;
		return true;
	}

	// 3byte(21bit)
	if( us < 0x200000 ){
		b[0] =             ((a[0]<<0)&0x7F) | 0x80;
		b[1] = (a[0]>>7) | ((a[1]<<1)&0x7F) | 0x80;
		b[2] = (a[1]>>6) | ((a[2]<<2)&0x7F);
		if( fwrite( b, 1, 3, (FILE*)_p )     != 3 ) return false;
		if( p_add ) *p_add += 3;
		return true;
	}

	// 4byte(28bit)
	if( us < 0x10000000 ){
		b[0] =             ((a[0]<<0)&0x7F) | 0x80;
		b[1] = (a[0]>>7) | ((a[1]<<1)&0x7F) | 0x80;
		b[2] = (a[1]>>6) | ((a[2]<<2)&0x7F) | 0x80;
		b[3] = (a[2]>>5) | ((a[3]<<3)&0x7F);
		if( fwrite( b, 1, 4, (FILE*)_p )     != 4 ) return false;
		if( p_add ) *p_add += 4;
		return true;
	}

	// 5byte(35bit)
//	if( value < 0x800000000 ){
	if( us <= 0xffffffff ){

		b[0] =             ((a[0]<<0)&0x7F) | 0x80;
		b[1] = (a[0]>>7) | ((a[1]<<1)&0x7F) | 0x80;
		b[2] = (a[1]>>6) | ((a[2]<<2)&0x7F) | 0x80;
		b[3] = (a[2]>>5) | ((a[3]<<3)&0x7F) | 0x80;
		b[4] = (a[3]>>4) | ((a[4]<<4)&0x7F);
		if( fwrite( b, 1, 5, (FILE*)_p )     != 5 ) return false;
		if( p_add ) *p_add += 5;
		return true;
	}

	return false;
}


// ‰Â•Ï’·“Ç‚Ýž‚Ýiunsigned int  ‚Ü‚Å‚ð•ÛØj
bool pxwrDoc::v_r  ( int *p  )
{
	if( !_p ) return false;

	int  i;
	unsigned char a[5];
	unsigned char b[5];

	b[0] = b[1] = b[2] = b[3] = b[4] = 0;

	for( i = 0; i < 5; i++ )
	{
		if( !pxwrDoc::r( &a[i], 1, 1 ) ) return false;
		if( !(a[i] & 0x80) ) break;
	}
	switch( i ){
	case 0:
		b[0]    =  (a[0]&0x7F)>>0;
		break;
	case 1:
		b[0]    = ((a[0]&0x7F)>>0) | (a[1]<<7);
		b[1]    =  (a[1]&0x7F)>>1;
		break;
	case 2:
		b[0]    = ((a[0]&0x7F)>>0) | (a[1]<<7);
		b[1]    = ((a[1]&0x7F)>>1) | (a[2]<<6);
		b[2]    =  (a[2]&0x7F)>>2;
		break;
	case 3:
		b[0]    = ((a[0]&0x7F)>>0) | (a[1]<<7);
		b[1]    = ((a[1]&0x7F)>>1) | (a[2]<<6);
		b[2]    = ((a[2]&0x7F)>>2) | (a[3]<<5);
		b[3]    =  (a[3]&0x7F)>>3;
		break;
	case 4:
		b[0]    = ((a[0]&0x7F)>>0) | (a[1]<<7);
		b[1]    = ((a[1]&0x7F)>>1) | (a[2]<<6);
		b[2]    = ((a[2]&0x7F)>>2) | (a[3]<<5);
		b[3]    = ((a[3]&0x7F)>>3) | (a[4]<<4);
		b[4]    =  (a[4]&0x7F)>>4;
		break;
	case 5:
		return false;
	}

	*p = *((int  *)b);

	return true;
}



bool pxwrDoc::r_txt( void *p_buf, int buf_size )
{
	if( !_p || !_b_file ) return false;
	
	bool b_ret = false     ;
	unsigned char l = 0;
	char *p = (char*)p_buf;

	if( !pxwrDoc::r( &l, sizeof(l), 1 ) ) goto End;
	if( l >= buf_size ) goto End;
	if( !pxwrDoc::r(  p,         1, l ) ) goto End;
	p[ l ] = '\0';

	b_ret = true;
End:
	
	return b_ret;
}

bool pxwrDoc::gets ( char *p_buf, int buf_size )
{
	if( !_p || !_b_file ) return false;

	if( !fgets( p_buf, buf_size, (FILE*)_p ) ) return false;
	
	for( int i = strlen( p_buf ) - 1; i >= 0; i-- )
	{
		if( p_buf[ i ] == 0x0d || p_buf[ i ] == 0x0a ) p_buf[ i ] = 0x00;
		else break;
	}
	return true;
}

