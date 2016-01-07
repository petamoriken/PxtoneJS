#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "./pxPulse_NoiseBuilder.h"

#define _BASIC_SPS       44100.0
#define _BASIC_FREQUENCY   100.0 // 100 Hz
#define _SAMPLING_TOP      32767 //  16 bit max
#define _KEY_TOP          0x3200 //  40 key

#define _smp_num_rand    44100
#define _smp_num         (long)( _BASIC_SPS / _BASIC_FREQUENCY )


enum _RANDOMTYPE
{
	_RANDOM_None = 0,
	_RANDOM_Saw     ,
	_RANDOM_Rect    ,
};

typedef struct
{
	double      incriment;
	double      offset;
	double      volume;
	const short *p_smp;
	bool        bReverse;
	_RANDOMTYPE ran_type;
	long        rdm_start;
	long        rdm_margin;
	long        rdm_index;
}
_OSCILLATOR;

typedef struct
{
	long   smp;
	double mag;
}
_POINT;

typedef struct
{
	bool        bEnable;
	double      pan[ 2 ];
	long        enve_index;
	double      enve_mag_start;
	double      enve_mag_margin;
	long        enve_count;
	long        enve_num;
	_POINT      *enves;

	_OSCILLATOR main;
	_OSCILLATOR freq;
	_OSCILLATOR volu;
}
_UNIT;

void _set_ocsillator( _OSCILLATOR *p_to, pxNOISEDESIGN_OSCILLATOR *p_from, long sps, const short *p_tbl, const short *p_tbl_rand )
{
	const short *p;

	switch( p_from->type )
	{
	case pxWAVETYPE_Random : p_to->ran_type = _RANDOM_Saw ; break;
	case pxWAVETYPE_Random2: p_to->ran_type = _RANDOM_Rect; break;
	default                : p_to->ran_type = _RANDOM_None; break;
	}

	p_to->incriment  = ( _BASIC_SPS / sps ) * ( p_from->freq   / _BASIC_FREQUENCY );

	// offset
	if( p_to->ran_type != _RANDOM_None ) p_to->offset = 0;
	else                                 p_to->offset = (double) _smp_num * ( p_from->offset / 100 );

	p_to->volume     = ( p_from->volume   / 100 );
	p_to->p_smp      = p_tbl;//_p_tables[ p_from->type ];
	p_to->bReverse   = p_from->b_rev;

	p_to->rdm_start  = 0;
	p_to->rdm_index  = (long)( (double)(_smp_num_rand) * ( p_from->offset / 100 ) );
	p = p_tbl_rand;
	p_to->rdm_margin = p[ p_to->rdm_index ];

}

void _incriment( _OSCILLATOR *p_osc, double incriment, const short *p_tbl_rand )
{
	p_osc->offset += incriment;
	if( p_osc->offset > _smp_num )
	{
		p_osc->offset     -= _smp_num;
		if( p_osc->offset >= _smp_num ) p_osc->offset = 0;

		if( p_osc->ran_type != _RANDOM_None )
		{
			const short *p = p_tbl_rand;
			p_osc->rdm_start  = p[ p_osc->rdm_index ];
			p_osc->rdm_index++;
			if( p_osc->rdm_index >= _smp_num_rand ) p_osc->rdm_index = 0;
			p_osc->rdm_margin = p[ p_osc->rdm_index ] - p_osc->rdm_start;
		}
	}
}

static bool _malloc_zero( void **pp, long size )
{
	*pp = malloc( size ); if( !( *pp ) ) return false;
	memset( *pp, 0, size );              return true ;
}

static void _free_null( void **pp )
{
	if( *pp ){ free( *pp ); *pp = NULL; }
}

pxPulse_NoiseBuilder::pxPulse_NoiseBuilder()
{
	_b_init = false;
	_freq = NULL;
	for( int i = 0; i < pxWAVETYPE_num; i++ ) _p_tables[ i ] = NULL;
}

pxPulse_NoiseBuilder::~pxPulse_NoiseBuilder()
{
	_b_init = false;
	if( _freq ) delete _freq; _freq = NULL;
	for( int i = 0; i < pxWAVETYPE_num; i++ ) _free_null( (void **)&_p_tables[ i ] );
}

void  pxPulse_NoiseBuilder::_random_reset( void )
{
	_rand_buf[ 0 ] = 0x4444;
	_rand_buf[ 1 ] = 0x8888;
}

short pxPulse_NoiseBuilder::_random_get( void )
{
	long w1, w2;
	char *p1;
	char *p2;

	w1 = (short)_rand_buf[ 0 ] + _rand_buf[ 1 ];
	p1 = (char *)&w1;
	p2 = (char *)&w2;
	p2[ 0 ] = p1[ 1 ];
	p2[ 1 ] = p1[ 0 ];
	_rand_buf[ 1 ] = (short)_rand_buf[ 0 ];
	_rand_buf[ 0 ] = (short)w2;

	return (short)w2;
}

// prepare tables. (110Hz)
bool pxPulse_NoiseBuilder::Init()
{
	long   s;
	short  *p;
	double work;

	int    a;
	short  v;

	pxPulse_Oscillator osci;

	s32POINT overtones_sine[ 1] = { {1,128} };
	s32POINT overtones_saw2[16] = { { 1,128},{ 2,128},{ 3,128},{ 4,128}, { 5,128},{ 6,128},{ 7,128},{ 8,128},
									{ 9,128},{10,128},{11,128},{12,128}, {13,128},{14,128},{15,128},{16,128},};
	s32POINT overtones_rect2[8] = { {1,128},{3,128},{5,128},{7,128}, {9,128},{11,128},{13,128},{15,128},};

	s32POINT coodi_tri[ 4 ] = { {0,0}, {_smp_num/4,128}, {_smp_num*3/4,-128}, {_smp_num,0} };
	
	if( _b_init ) return true;

	_freq = new pxPulse_Frequency(); if( !_freq->Init() ) goto End;


	for( s = 0; s < pxWAVETYPE_num; s++ ) _p_tables[ s ] = NULL;

	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_None    ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Sine    ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Saw     ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Rect    ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Random  ], sizeof(short) * _smp_num_rand ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Saw2    ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Rect2   ], sizeof(short) * _smp_num      ) ) goto End;

	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Tri     ], sizeof(short) * _smp_num      ) ) goto End;
//	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Random2 ], sizeof(short) * _smp_num_rand ) ) goto End; x
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Rect3   ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Rect4   ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Rect8   ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Rect16  ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Saw3    ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Saw4    ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Saw6    ], sizeof(short) * _smp_num      ) ) goto End;
	if( !_malloc_zero( (void **)&_p_tables[ pxWAVETYPE_Saw8    ], sizeof(short) * _smp_num      ) ) goto End;

	// none --

    // sine --
	osci.ReadyGetSample( overtones_sine, 1, 128, _smp_num, 0 );
	p = _p_tables[ pxWAVETYPE_Sine ];
	for( s = 0; s < _smp_num; s++ )
	{
		work = osci.GetOneSample_Overtone( s ); if( work > 1.0 ) work = 1.0; if( work < -1.0 ) work = -1.0;
		*p = (short)( work * _SAMPLING_TOP );
		p++;
	}

	// saw down --
	p = _p_tables[ pxWAVETYPE_Saw ];
	work = _SAMPLING_TOP + _SAMPLING_TOP;
	for( s = 0; s < _smp_num; s++ ){
		*p = (short)( _SAMPLING_TOP - work * s / _smp_num );
		p++;
	}

	// rect --
	p = _p_tables[ pxWAVETYPE_Rect ];
	for( s = 0; s < _smp_num / 2; s++ ){ *p = (short)( _SAMPLING_TOP  ); p++; }
	for( s    ; s < _smp_num    ; s++ ){ *p = (short)( -_SAMPLING_TOP ); p++; }

	// random -- 
	p = _p_tables[ pxWAVETYPE_Random ];
	_random_reset();
	for( s = 0; s < _smp_num_rand; s++ ){ *p = _random_get(); p++; }

    // saw2 --
	osci.ReadyGetSample( overtones_saw2, 16, 128, _smp_num, 0 );
	p = _p_tables[ pxWAVETYPE_Saw2 ];
	for( s = 0; s < _smp_num; s++ )
	{
		work = osci.GetOneSample_Overtone( s ); if( work > 1.0 ) work = 1.0; if( work < -1.0 ) work = -1.0;
		*p = (short)( work * _SAMPLING_TOP );
		p++;
	}

    // rect2 --
	osci.ReadyGetSample( overtones_rect2, 8, 128, _smp_num, 0 );
	p = _p_tables[ pxWAVETYPE_Rect2 ];
	for( s = 0; s < _smp_num; s++ )
	{
		work = osci.GetOneSample_Overtone( s ); if( work > 1.0 ) work = 1.0; if( work < -1.0 ) work = -1.0;
		*p = (short)( work * _SAMPLING_TOP );
		p++;
	}

	// Triangle -- 
	osci.ReadyGetSample( coodi_tri, 4, 128, _smp_num, _smp_num );	
	p = _p_tables[ pxWAVETYPE_Tri ];
	for( s = 0; s < _smp_num; s++ )
	{
		work = osci.GetOneSample_Coodinate( s ); if( work > 1.0 ) work = 1.0; if( work < -1.0 ) work = -1.0;
		*p = (short)( work * _SAMPLING_TOP );
		p++;
	}

	// Random2  -- x

	// Rect-3  -- 
	p = _p_tables[ pxWAVETYPE_Rect3 ];
	for( s = 0; s < _smp_num /  3; s++ ){ *p = (short)(  _SAMPLING_TOP ); p++; }
	for( s    ; s < _smp_num     ; s++ ){ *p = (short)( -_SAMPLING_TOP ); p++; }
	// Rect-4   -- 
	p = _p_tables[ pxWAVETYPE_Rect4 ];
	for( s = 0; s < _smp_num /  4; s++ ){ *p = (short)(  _SAMPLING_TOP ); p++; }
	for( s    ; s < _smp_num     ; s++ ){ *p = (short)( -_SAMPLING_TOP ); p++; }
	// Rect-8   -- 
	p = _p_tables[ pxWAVETYPE_Rect8 ];
	for( s = 0; s < _smp_num /  8; s++ ){ *p = (short)(  _SAMPLING_TOP ); p++; }
	for( s    ; s < _smp_num     ; s++ ){ *p = (short)( -_SAMPLING_TOP ); p++; }
	// Rect-16  -- 
	p = _p_tables[ pxWAVETYPE_Rect16 ];
	for( s = 0; s < _smp_num / 16; s++ ){ *p = (short)(  _SAMPLING_TOP ); p++; }
	for( s    ; s < _smp_num     ; s++ ){ *p = (short)( -_SAMPLING_TOP ); p++; }

	// Saw-3    -- 
	p = _p_tables[ pxWAVETYPE_Saw3 ];
	for( s = 0; s < _smp_num /  3; s++ ){ *p = (short)(  _SAMPLING_TOP ); p++; }
	for( s    ; s < _smp_num*2/ 3; s++ ){ *p = (short)(              0 ); p++; }
	for( s    ; s < _smp_num     ; s++ ){ *p = (short)( -_SAMPLING_TOP ); p++; }

	// Saw-4    -- 
	p = _p_tables[ pxWAVETYPE_Saw4 ];
	for( s = 0; s < _smp_num  / 4; s++ ){ *p = (short)(  _SAMPLING_TOP   ); p++; }
	for( s    ; s < _smp_num*2/ 4; s++ ){ *p = (short)(  _SAMPLING_TOP/3 ); p++; }
	for( s    ; s < _smp_num*3/ 4; s++ ){ *p = (short)( -_SAMPLING_TOP/3 ); p++; }
	for( s    ; s < _smp_num     ; s++ ){ *p = (short)( -_SAMPLING_TOP   ); p++; }

	// Saw-6    -- 
	p = _p_tables[ pxWAVETYPE_Saw6 ];
	a = _smp_num *1 / 6; v =  _SAMPLING_TOP                    ; for( s = 0; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *2 / 6; v =  _SAMPLING_TOP - _SAMPLING_TOP*2/5; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *3 / 6; v =                  _SAMPLING_TOP  /5; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *4 / 6; v =                - _SAMPLING_TOP  /5; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *5 / 6; v = -_SAMPLING_TOP + _SAMPLING_TOP*2/5; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num       ; v = -_SAMPLING_TOP                    ; for( s    ; s < a; s++ ){ *p = v; p++; }

	// Saw-8    -- 
	p = _p_tables[ pxWAVETYPE_Saw8 ];
	a = _smp_num *1 / 8; v =  _SAMPLING_TOP                    ; for( s = 0; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *2 / 8; v =  _SAMPLING_TOP - _SAMPLING_TOP*2/7; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *3 / 8; v =  _SAMPLING_TOP - _SAMPLING_TOP*4/7; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *4 / 8; v =                  _SAMPLING_TOP  /7; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *5 / 8; v =                - _SAMPLING_TOP  /7; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *6 / 8; v = -_SAMPLING_TOP + _SAMPLING_TOP*4/7; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num *7 / 8; v = -_SAMPLING_TOP + _SAMPLING_TOP*2/7; for( s    ; s < a; s++ ){ *p = v; p++; }
	a = _smp_num       ; v = -_SAMPLING_TOP                    ; for( s    ; s < a; s++ ){ *p = v; p++; }

	_b_init = true;
End:

	return _b_init;
}

pxPulse_PCM *pxPulse_NoiseBuilder::BuildNoise( pxPulse_Noise *p_noise, long ch, long sps, long bps ) const
{
	if( !_b_init ) return NULL;

	bool   b_ret = false;
	long   offset;
	double work;
	double vol;
	double fre;
	double store;
	long   long_;
	long   unit_num;
	unsigned char *p = NULL;
	long          smp_num;

	_UNIT       *units = NULL;
	pxPulse_PCM *p_pcm = NULL;

	p_noise->Fix();

	unit_num = p_noise->get_unit_num();

	if( !_malloc_zero( (void**)&units, sizeof(_UNIT) * unit_num ) ) goto End;

	for( int u = 0; u < unit_num; u++ )
	{
		_UNIT *pU = &units[ u ];

		pxNOISEDESIGN_UNIT *p_du = p_noise->get_unit( u );

		pU->bEnable     = p_du->bEnable;
		pU->enve_num    = p_du->enve_num;
		if(       p_du->pan == 0 )
		{
			pU->pan[ 0 ] = 1;
			pU->pan[ 1 ] = 1;
		}
		else if( p_du->pan < 0 )
		{
			pU->pan[ 0 ] = 1;
			pU->pan[ 1 ] = (double)( 100.0f + p_du->pan ) / 100;
		}
		else
		{
			pU->pan[ 1 ] = 1;
			pU->pan[ 0 ] = (double)( 100.0f - p_du->pan ) / 100;
		}

		if( !_malloc_zero( (void**)&pU->enves, sizeof(_POINT) * pU->enve_num ) ) goto End;

		// envelope
		for( int e = 0; e < p_du->enve_num; e++ )
		{
			pU->enves[ e ].smp =   sps * p_du->enves[ e ].x / 1000;
			pU->enves[ e ].mag = (double)p_du->enves[ e ].y /  100;
		}
		pU->enve_index      = 0;
		pU->enve_mag_start  = 0;
		pU->enve_mag_margin = 0;
		pU->enve_count      = 0;
		while( pU->enve_index < pU->enve_num )
		{
			pU->enve_mag_margin = pU->enves[ pU->enve_index ].mag - pU->enve_mag_start;
			if( pU->enves[ pU->enve_index ].smp ) break;
			pU->enve_mag_start = pU->enves[ pU->enve_index ].mag;
			pU->enve_index++;
		}

		_set_ocsillator( &pU->main, &p_du->main, sps, _p_tables[ p_du->main.type ], _p_tables[ pxWAVETYPE_Random ] );
		_set_ocsillator( &pU->freq, &p_du->freq, sps, _p_tables[ p_du->freq.type ], _p_tables[ pxWAVETYPE_Random ] );
		_set_ocsillator( &pU->volu, &p_du->volu, sps, _p_tables[ p_du->volu.type ], _p_tables[ pxWAVETYPE_Random ] );
	}

	smp_num = p_noise->get_smp_num_44k() / ( 44100 / sps );

	p_pcm = new pxPulse_PCM();
	if( !p_pcm->Make( ch, sps, bps, smp_num ) ) goto End;
	p = (unsigned char*)p_pcm->get_p_buf_variable();

	for( int s = 0; s < smp_num; s++ )
	{
		for( int c = 0; c < ch; c++ )
		{
			store = 0;
			for( int u = 0; u < unit_num; u++ )
			{
				_UNIT *pU = &units[ u ];
	
				if( pU->bEnable )
				{
					_OSCILLATOR *po;

					// main
					po = &pU->main;
					switch( po->ran_type )
					{
					case _RANDOM_None:
//						if( po->bReverse ) offset = _smp_num - (long)po->offset - 1;
//						else
						offset =            (long)po->offset    ;
						if( offset >= 0  ) work = po->p_smp[ offset ];
						else               work = 0;
						break;
					case _RANDOM_Saw:
						if( po->offset >= 0 ) work = po->rdm_start + po->rdm_margin * (long)po->offset / _smp_num;
						else                  work = 0;
						break;
					case _RANDOM_Rect:
						if( po->offset >= 0 ) work = po->rdm_start;
						else                  work = 0;
						break;
					}
					if( po->bReverse ) work *= -1;
					work *= po->volume;
					
					// volu
					po = &pU->volu;
					switch( po->ran_type )
					{
					case _RANDOM_None:
//						if( po->bReverse ) offset = _smp_num - (long)po->offset - 1;
//						else
						offset =            (long)po->offset    ;
						vol  = (double)po->p_smp[ offset ];
						break;
					case _RANDOM_Saw:
						vol = po->rdm_start + po->rdm_margin * (long)po->offset / _smp_num;
						break;
					case _RANDOM_Rect:
						vol = po->rdm_start;
						break;
					}
					if( po->bReverse ) vol *= -1;
					vol *= po->volume;

					work = work * ( vol + _SAMPLING_TOP ) / ( _SAMPLING_TOP * 2 );
					work = work * pU->pan[ c ];

					// envelope
					if( pU->enve_index < pU->enve_num )
						work *= pU->enve_mag_start + ( pU->enve_mag_margin * pU->enve_count / pU->enves[ pU->enve_index ].smp );
					else 
						work *= pU->enve_mag_start;
					store += work;
				}
			}

			long_ = (long)store;
			if( long_ >  _SAMPLING_TOP ) long_ =  _SAMPLING_TOP;
			if( long_ < -_SAMPLING_TOP ) long_ = -_SAMPLING_TOP;
			if( bps ==  8 ){ *           p   = (unsigned char)( ( long_ >> 8 ) + 128 ); p += 1; } //  8bit
			else           { *( (short *)p ) = (short        )    long_               ; p += 2; } // 16bit
		}

		// incriment
		for( int u = 0; u < unit_num; u++ )
		{
			_UNIT *pU = &units[ u ];

			if( pU->bEnable )
			{
				_OSCILLATOR *po = &pU->freq;

				switch( po->ran_type )
				{
				case _RANDOM_None:
//					if( po->bReverse ) offset = _smp_num - (long)po->offset - 1;
//					else
					offset =            (long)po->offset    ;
					fre = _KEY_TOP * po->p_smp[ offset ] / _SAMPLING_TOP;
					break;
				case _RANDOM_Saw:
					fre = po->rdm_start + po->rdm_margin * (long) po->offset / _smp_num;
					break;
				case _RANDOM_Rect:
					fre = po->rdm_start;
					break;
				}

				if( po->bReverse ) fre *= -1;
				fre *= po->volume;

				_incriment( &pU->main, pU->main.incriment * _freq->Get( (long)fre ), _p_tables[ pxWAVETYPE_Random ] );
				_incriment( &pU->freq, pU->freq.incriment,                           _p_tables[ pxWAVETYPE_Random ] );
				_incriment( &pU->volu, pU->volu.incriment,                           _p_tables[ pxWAVETYPE_Random ] );

				// envelope
				if( pU->enve_index < pU->enve_num )
				{
					pU->enve_count++;
					if( pU->enve_count >= pU->enves[ pU->enve_index ].smp )
					{
						pU->enve_count      = 0;
						pU->enve_mag_start  = pU->enves[ pU->enve_index ].mag;
						pU->enve_mag_margin = 0;
						pU->enve_index++;
						while( pU->enve_index < pU->enve_num )
						{
							pU->enve_mag_margin = pU->enves[ pU->enve_index ].mag - pU->enve_mag_start;
							if( pU->enves[ pU->enve_index ].smp ) break;
							pU->enve_mag_start  = pU->enves[ pU->enve_index ].mag;
							pU->enve_index++;
						}
					}
				}
			}
		}
	}

	b_ret = true;

End:
	if( units ) _free_null( (void**)&units );

	if( !b_ret && p_pcm ) SAFE_DELETE( p_pcm ); 

	return p_pcm;
}
