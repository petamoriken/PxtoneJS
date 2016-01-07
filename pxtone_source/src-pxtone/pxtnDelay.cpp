#include <stdlib.h>
#include <string.h>

#include "./pxtnMax.h"

#include "./pxtnDelay.h"

pxtnDelay::pxtnDelay()
{
	for( int i = 0; i < MAX_CHANNEL; i ++ ) _bufs[ i ] = NULL;
	_smp_num   =    0;
	_b_played = true;
}

pxtnDelay::~pxtnDelay()
{
	Tone_Release();
}
/*
bool pxtnDelay::Init()
{
	return true;
}
*/
DELAYUNIT pxtnDelay::get_unit ()const { return _unit ; }
int       pxtnDelay::get_group()const { return _group; }
float     pxtnDelay::get_rate ()const { return _rate ; }
float     pxtnDelay::get_freq ()const { return _freq ; }

void      pxtnDelay::Set( DELAYUNIT unit, float freq, float rate, int group )
{
	_unit  = unit ;
	_group = group;
	_rate  = rate ;
	_freq  = freq ;
}

bool pxtnDelay::get_played()const{ return _b_played; }
void pxtnDelay::set_played( bool b ){ _b_played = b; }
bool pxtnDelay::switch_played(){ _b_played = _b_played ? false : true; return _b_played; }



void pxtnDelay::Tone_Release()
{
	for( int i = 0; i < MAX_CHANNEL; i ++ ){ if( _bufs[i] ) free( _bufs[i] ); _bufs[i] = NULL; }
	_smp_num = 0;
}

bool pxtnDelay::Tone_Ready( int beat_num, float beat_tempo, int sps, int bps )
{
	Tone_Release();

	if( !_freq || !_rate ) return true;

	bool  b_ret = false;

	_offset    = 0;
	_rate_long = (long)_rate;// / 100;

	switch( _unit )
	{
	case DELAYUNIT_Beat  : _smp_num = (int)( sps * 60            / beat_tempo / _freq ); break;
	case DELAYUNIT_Meas  : _smp_num = (int)( sps * 60 * beat_num / beat_tempo / _freq ); break;
	case DELAYUNIT_Second: _smp_num = (int)( sps                              / _freq ); break;
	}

	for( int c = 0; c < MAX_CHANNEL; c++ )
	{
		if( !(  _bufs[ c ] = (int*)malloc( _smp_num * sizeof(int) ) ) ) goto End;
		memset( _bufs[ c ], 0,             _smp_num * sizeof(int) );
	}

	b_ret = true;
End:

	if( !b_ret ) Tone_Release();

	return b_ret;
}

void pxtnDelay::Tone_Supple( int ch, long *group_smps )
{
	if( !_smp_num ) return;
	int a = _bufs[ ch ][ _offset ] * _rate_long / 100;
	if( _b_played ) group_smps[ _group ] += a;
	_bufs[ ch ][ _offset ] =  group_smps[ _group ];
}

void pxtnDelay::Tone_Increment()
{
	if( !_smp_num ) return;
	if( ++_offset >= _smp_num ) _offset = 0;
}

void  pxtnDelay::Tone_Clear( void )
{
	if( !_smp_num ) return;

	int def = 0; // ..

	//	TuneData_Quality_Get( NULL, NULL, &bps );

	for( int i = 0; i < MAX_CHANNEL; i ++ ) memset( _bufs[ i ], def, _smp_num * sizeof(int) );
}


// (12byte) =================
typedef struct
{
	unsigned short unit ;
	unsigned short group;
	float          rate ;
	float          freq ;
}
_DELAYSTRUCT;

bool pxtnDelay::Write( pxwrDoc *p_doc ) const
{
	_DELAYSTRUCT    dela;
	long            size;

	memset( &dela, 0, sizeof( _DELAYSTRUCT ) );
	dela.unit  = (unsigned short)_unit ;
	dela.group = (unsigned short)_group;
	dela.rate  = _rate;
	dela.freq  = _freq;

	// dela ----------
	size = sizeof( _DELAYSTRUCT );
	if( !p_doc->w( &size, sizeof(unsigned long), 1 ) ) return false;
	if( !p_doc->w( &dela, size,                  1 ) ) return false;

	return true;
}

bool pxtnDelay::Read( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	_DELAYSTRUCT dela;
	long         size;

	memset( &dela, 0, sizeof(_DELAYSTRUCT) );
	if( !p_doc->r( &size, 4,                    1 ) ) return false;
	if( !p_doc->r( &dela, sizeof(_DELAYSTRUCT), 1 ) ) return false;
	if( dela.unit >= DELAYUNIT_num ){ *pb_new_fmt = true; return false; }

	_unit  = (DELAYUNIT)dela.unit;
	_freq  = dela.freq ;
	_rate  = dela.rate ;
	_group = dela.group;

	if( _group >= MAX_TUNEGROUPNUM ) _group = 0;

	return true;
}


