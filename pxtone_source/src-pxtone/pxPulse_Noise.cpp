#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "./pxPulse_Noise.h"


void pxPulse_Noise::set_smp_num_44k( int num )
{
	_smp_num_44k = num;
}

int pxPulse_Noise::get_unit_num() const
{
	return _unit_num;
}

int pxPulse_Noise::get_smp_num_44k() const
{
	return _smp_num_44k;
}

float pxPulse_Noise::get_sec() const
{
	return (float)_smp_num_44k / 44100;
}


pxNOISEDESIGN_UNIT *pxPulse_Noise::get_unit( int u )
{
	if( !_units || u < 0 || u >= _unit_num ) return NULL;
	return &_units[ u ];
}


pxPulse_Noise::pxPulse_Noise()
{
	_units       = NULL;
	_unit_num    =    0;
	_smp_num_44k =    0;
}

pxPulse_Noise::~pxPulse_Noise()
{
	if( _units ) free( _units ); _units = NULL; _unit_num = 0;
}


#define NOISEDESIGNLIMIT_SMPNUM (44100 * 10)
#define NOISEDESIGNLIMIT_ENVE_X ( 1000 * 10)
#define NOISEDESIGNLIMIT_ENVE_Y (  100     )
#define NOISEDESIGNLIMIT_OSC_FREQUENCY 44100.0f
#define NOISEDESIGNLIMIT_OSC_VOLUME      200.0f
#define NOISEDESIGNLIMIT_OSC_OFFSET      100.0f

static void _FixUnit( pxNOISEDESIGN_OSCILLATOR *p_osc )
{
	if( p_osc->type   >= pxWAVETYPE_num                 ) p_osc->type   = pxWAVETYPE_None;
	if( p_osc->freq   >  NOISEDESIGNLIMIT_OSC_FREQUENCY ) p_osc->freq   = NOISEDESIGNLIMIT_OSC_FREQUENCY;
	if( p_osc->freq   <= 0                              ) p_osc->freq   = 0;
	if( p_osc->volume >  NOISEDESIGNLIMIT_OSC_VOLUME    ) p_osc->volume = NOISEDESIGNLIMIT_OSC_VOLUME;
	if( p_osc->volume <= 0                              ) p_osc->volume = 0;
	if( p_osc->offset >  NOISEDESIGNLIMIT_OSC_OFFSET    ) p_osc->offset = NOISEDESIGNLIMIT_OSC_OFFSET;
	if( p_osc->offset <= 0                              ) p_osc->offset = 0;
}

void pxPulse_Noise::Fix()
{
	pxNOISEDESIGN_UNIT *p_unit;
	long i, e;

	if( _smp_num_44k > NOISEDESIGNLIMIT_SMPNUM ) _smp_num_44k = NOISEDESIGNLIMIT_SMPNUM;

	for( i = 0; i < _unit_num; i++ )
	{
		p_unit = &_units[ i ];
		if( p_unit->bEnable )
		{
			for( e = 0; e < p_unit->enve_num; e++ )
			{
				if( p_unit->enves[ e ].x > NOISEDESIGNLIMIT_ENVE_X ) p_unit->enves[ e ].x = NOISEDESIGNLIMIT_ENVE_X;
				if( p_unit->enves[ e ].x <                       0 ) p_unit->enves[ e ].x =                       0;
				if( p_unit->enves[ e ].y > NOISEDESIGNLIMIT_ENVE_Y ) p_unit->enves[ e ].y = NOISEDESIGNLIMIT_ENVE_Y;
				if( p_unit->enves[ e ].y <                       0 ) p_unit->enves[ e ].y =                       0;
			}
			if( p_unit->pan < -100 ) p_unit->pan = -100;
			if( p_unit->pan >  100 ) p_unit->pan =  100;
			_FixUnit( &p_unit->main );
			_FixUnit( &p_unit->freq );
			_FixUnit( &p_unit->volu );
		}
	}
}

int pxPulse_Noise::SamplingSize( int channel_num, int sps, int bps ) const
{
	int    smp_num = _smp_num_44k / ( 44100 / sps );
	return smp_num * channel_num * bps / 8;
}


#define MAX_NOISEEDITUNITNUM     4
#define MAX_NOISEEDITENVELOPENUM 3

#define NOISEEDITFLAG_XX1       0x0001
#define NOISEEDITFLAG_XX2       0x0002
#define NOISEEDITFLAG_ENVELOPE  0x0004
#define NOISEEDITFLAG_PAN       0x0008
#define NOISEEDITFLAG_OSC_MAIN  0x0010
#define NOISEEDITFLAG_OSC_FREQ  0x0020
#define NOISEEDITFLAG_OSC_VOLU  0x0040
#define NOISEEDITFLAG_OSC_PAN   0x0080
#define NOISEEDITFLAG_UNCOVERED 0xffffff83

//                                   01234567
static const char          *_code = "PTNOISE-";
//static const unsigned long _ver =  20051028; -v.0.9.2.3
static const unsigned long _ver   =  20120418; // 16 wave types.

static bool _malloc_zero( void **pp, long size )
{
	*pp = malloc( size ); if( !( *pp ) ) return false;
	memset( *pp, 0, size );              return true ;
}

static void _free_null( void **pp )
{
	if( *pp ){ free( *pp ); *pp = NULL; }
}

static bool _WriteOscillator( const pxNOISEDESIGN_OSCILLATOR *p_osc, pxwrDoc *p_doc, int *p_add )
{
	long work;
	work = (long)p_osc->type         ; if( !p_doc->v_w( work, p_add ) ) return false;
	work = (long)p_osc->b_rev        ; if( !p_doc->v_w( work, p_add ) ) return false;
	work = (long)(p_osc->freq   * 10); if( !p_doc->v_w( work, p_add ) ) return false;
	work = (long)(p_osc->volume * 10); if( !p_doc->v_w( work, p_add ) ) return false;
	work = (long)(p_osc->offset * 10); if( !p_doc->v_w( work, p_add ) ) return false;
	return true;
}

static bool _ReadOscillator( pxNOISEDESIGN_OSCILLATOR *p_osc, pxwrDoc *p_doc, bool *pb_new )
{
	int work;
	if( !p_doc->v_r( &work ) ) return false; p_osc->type     = (pxWAVETYPE)work;
	if( p_osc->type >= pxWAVETYPE_num ){ *pb_new = true; return false; }
	if( !p_doc->v_r( &work ) ) return false; p_osc->b_rev    = work ? true : false;
	if( !p_doc->v_r( &work ) ) return false; p_osc->freq     = (float)work / 10;
	if( !p_doc->v_r( &work ) ) return false; p_osc->volume   = (float)work / 10;
	if( !p_doc->v_r( &work ) ) return false; p_osc->offset   = (float)work / 10;
	return true;
}

static long _MakeFlags( const pxNOISEDESIGN_UNIT *pU )
{
	long flags = 0;
	flags |= NOISEEDITFLAG_ENVELOPE;
	if( pU->pan                          ) flags |= NOISEEDITFLAG_PAN;
	if( pU->main.type != pxWAVETYPE_None ) flags |= NOISEEDITFLAG_OSC_MAIN;
	if( pU->freq.type != pxWAVETYPE_None ) flags |= NOISEEDITFLAG_OSC_FREQ;
	if( pU->volu.type != pxWAVETYPE_None ) flags |= NOISEEDITFLAG_OSC_VOLU;
	return flags;
}

bool pxPulse_Noise::Write( pxwrDoc *p_doc, long *p_add ) const
{
	bool  b_ret = false;
	int   u, e, seek, num_seek, flags;
	char  byte;
	char  unit_num = 0;
	const pxNOISEDESIGN_UNIT *pU;

//	Fix();

	if( p_add ) seek = *p_add;
	else        seek =      0;

	if( !p_doc->w( _code, 1, 8 ) ) goto End;
	if( !p_doc->w( &_ver, 4, 1 ) ) goto End;
	seek += 12;
	if( !p_doc->v_w( _smp_num_44k, &seek ) ) goto End;

	if( !p_doc->w( &unit_num , 1, 1 ) ) goto End;
	num_seek = seek;
	seek += 1;

	for( u = 0; u < _unit_num; u++ )
	{
		pU = &_units[ u ];
		if( pU->bEnable )
		{
			// フラグ
			flags = _MakeFlags( pU );
			if( !p_doc->v_w( flags, &seek ) ) goto End;
			if( flags & NOISEEDITFLAG_ENVELOPE )
			{
				if( !p_doc->v_w( pU->enve_num, &seek ) ) goto End;
				for( e = 0; e < pU->enve_num; e++ )
				{
					if( !p_doc->v_w( pU->enves[ e ].x, &seek ) ) goto End;
					if( !p_doc->v_w( pU->enves[ e ].y, &seek ) ) goto End;
				}
			}
			if( flags & NOISEEDITFLAG_PAN      )
			{
				byte = (char)pU->pan;
				if( !p_doc->w( &byte, 1, 1 ) ) goto End;
				seek++;
			}
			if( flags & NOISEEDITFLAG_OSC_MAIN ){ if( !_WriteOscillator( &pU->main, p_doc, &seek ) ) goto End; }
			if( flags & NOISEEDITFLAG_OSC_FREQ ){ if( !_WriteOscillator( &pU->freq, p_doc, &seek ) ) goto End; }
			if( flags & NOISEEDITFLAG_OSC_VOLU ){ if( !_WriteOscillator( &pU->volu, p_doc, &seek ) ) goto End; }
			unit_num++;
		}
	}

	// update unit_num.
	p_doc->Seek( SEEK_CUR, num_seek - seek );
	if( !p_doc->w( &unit_num, 1, 1 ) ) goto End;
	p_doc->Seek( SEEK_CUR, seek - num_seek -1 );
	if( p_add ) *p_add = seek;

	b_ret = true;
End:

	return b_ret;
}

bool pxPulse_Noise::Save( const char* path ) const
{
	bool    b_ret = false;
	pxwrDoc doc;

	if( !doc.Open_path( path, "wb" ) ) return false;
	b_ret = Write( &doc, NULL ) ? true : false;

	return b_ret;
}

bool pxPulse_Noise::Load( const char* path, bool *p_bNew )
{
	bool    b_ret = false;
	pxwrDoc doc;

	if( !doc.Open_path( path, "rb" ) ) return false;
	b_ret = Read( &doc, p_bNew ) ? true : false;

	return b_ret;
}

bool pxPulse_Noise::Read( pxwrDoc *p_doc, bool *pb_new )
{
	bool b_ret = false;
	int  flags;
	char unit_num;
	char byte;
	unsigned long ver;
	pxNOISEDESIGN_UNIT *pU;
	char code[8];

	Release();
	
	if( !p_doc->r( code, 1, 8 ) ) goto End;

	if( memcmp( code, _code, 8 )     ) goto End;
	if( !p_doc->r( &ver     , 4, 1 ) ) goto End; if( ver > _ver ){ *pb_new = true; goto End; }
	if( !p_doc->v_r( &_smp_num_44k ) ) goto End;
	if( !p_doc->r( &unit_num, 1, 1 ) ) goto End;
	_unit_num = unit_num;
	if( _unit_num < 0 ) goto End;
	if( _unit_num > MAX_NOISEEDITUNITNUM ){ *pb_new = true; goto End; }

	if( !_malloc_zero( (void**)&_units, sizeof(pxNOISEDESIGN_UNIT) * _unit_num ) ) goto End;

	for( int u = 0; u < _unit_num; u++ )
	{
		pU = &_units[ u ];
		pU->bEnable = true;

		if( !p_doc->v_r( &flags ) )     goto End;// フラグ
		if( flags & NOISEEDITFLAG_UNCOVERED ){ *pb_new = true; goto End; }

		// エンベロープ
		if( flags & NOISEEDITFLAG_ENVELOPE )
		{
			if( !p_doc->v_r( &pU->enve_num ) ) goto End;
			if( pU->enve_num > MAX_NOISEEDITENVELOPENUM ){ *pb_new = true; goto End; }
			if( !_malloc_zero( (void**)&pU->enves, sizeof(s32POINT) * pU->enve_num ) ) goto End;
			for( int e = 0; e < pU->enve_num; e++ )
			{
				if( !p_doc->v_r( (int*)&pU->enves[ e ].x ) ) goto End;
				if( !p_doc->v_r( (int*)&pU->enves[ e ].y ) ) goto End;
			}
		}
		// パン
		if( flags & NOISEEDITFLAG_PAN )
		{
			if( !p_doc->r( &byte, 1, 1 ) ) goto End;
			pU->pan = byte;
		}
		
		if( flags & NOISEEDITFLAG_OSC_MAIN ){ if( !_ReadOscillator( &pU->main, p_doc, pb_new ) ) goto End; }
		if( flags & NOISEEDITFLAG_OSC_FREQ ){ if( !_ReadOscillator( &pU->freq, p_doc, pb_new ) ) goto End; }
		if( flags & NOISEEDITFLAG_OSC_VOLU ){ if( !_ReadOscillator( &pU->volu, p_doc, pb_new ) ) goto End; }
	}

	b_ret = true;
End:
	if( !b_ret ) Release();

	return b_ret;
}

void pxPulse_Noise::Release()
{
	if( _units )
	{
		for( int u = 0; u < _unit_num; u++ )
		{
			if( _units[ u ].enves ) _free_null( (void**)&_units[ u ].enves );
		}
		_free_null( (void**)&_units );
		_unit_num = 0;
	}
}

bool pxPulse_Noise::Allocate( long unit_num, long envelope_num )
{
	bool b_ret = false;

	Release();

	_unit_num = unit_num;
	if( !_malloc_zero( (void**)&_units, sizeof(pxNOISEDESIGN_UNIT) * unit_num ) ) goto End;

	for( int u = 0; u < unit_num; u++ )
	{
		pxNOISEDESIGN_UNIT *p_unit = &_units[ u ];
		p_unit->enve_num = envelope_num;
		if( !_malloc_zero( (void**)&p_unit->enves, sizeof(s32POINT) * p_unit->enve_num ) ) goto End;
	}

	b_ret = true;
End:
	if( !b_ret ) Release();

	return b_ret;
}

bool pxPulse_Noise::Copy( pxPulse_Noise *p_dst ) const
{
	if( !p_dst ) return false;

	bool b_ret    = false;

	p_dst->Release();
	p_dst->_smp_num_44k = _smp_num_44k;

	if( _unit_num )
	{
		int  enve_num = _units[ 0 ].enve_num;
		if( !p_dst->Allocate( _unit_num, enve_num ) ) goto End;
		for( int u = 0; u < _unit_num; u++ )
		{
			p_dst->_units[ u ].bEnable  = _units[ u ].bEnable ;
			p_dst->_units[ u ].enve_num = _units[ u ].enve_num;
			p_dst->_units[ u ].freq     = _units[ u ].freq    ;
			p_dst->_units[ u ].main     = _units[ u ].main    ;
			p_dst->_units[ u ].pan      = _units[ u ].pan     ;
			p_dst->_units[ u ].volu     = _units[ u ].volu    ;
			if( !( p_dst->_units[ u ].enves = (s32POINT*)malloc( sizeof(s32POINT) * enve_num ) ) ) goto End;
			for( int e = 0; e < enve_num; e++ ) p_dst->_units[ u ].enves[ e ] = _units[ u ].enves[ e ];
		}
	}

	b_ret = true;
End:
	if( !b_ret ) p_dst->Release();

	return b_ret;
}

static int _CompareOsci( const pxNOISEDESIGN_OSCILLATOR *p_osc1, const pxNOISEDESIGN_OSCILLATOR *p_osc2 )
{
	if( p_osc1->type   != p_osc2->type   ) return 1;
	if( p_osc1->freq   != p_osc2->freq   ) return 1;
	if( p_osc1->volume != p_osc2->volume ) return 1;
	if( p_osc1->offset != p_osc2->offset ) return 1;
	if( p_osc1->b_rev  != p_osc2->b_rev  ) return 1;
	return 0;
}

int pxPulse_Noise::Compare     ( const pxPulse_Noise *p_src ) const
{
	if( !p_src ) return -1;

	if( p_src->_smp_num_44k != _smp_num_44k ) return 1;
	if( p_src->_unit_num    != _unit_num    ) return 1;

	for( int u = 0; u < _unit_num; u++ )
	{
		if( p_src->_units[ u ].bEnable  != _units[ u ].bEnable  ) return 1;
		if( p_src->_units[ u ].enve_num != _units[ u ].enve_num ) return 1;
		if( p_src->_units[ u ].pan      != _units[ u ].pan      ) return 1;
		if( _CompareOsci( &p_src->_units[ u ].main, &_units[ u ].main ) ) return 1;
		if( _CompareOsci( &p_src->_units[ u ].freq, &_units[ u ].freq ) ) return 1;
		if( _CompareOsci( &p_src->_units[ u ].volu, &_units[ u ].volu ) ) return 1;

		for( int e = 0; e < _units[ u ].enve_num; e++ )
		{
			if( _units[ u ].enves[ e ].x != _units[ u ].enves[ e ].x ) return 1;
			if( _units[ u ].enves[ e ].y != _units[ u ].enves[ e ].y ) return 1;
		}
	}

	return 0;
}
