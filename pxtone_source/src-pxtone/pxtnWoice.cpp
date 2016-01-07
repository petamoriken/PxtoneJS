// '12/03/03

#include <stdlib.h>
#include <string.h>

#include "./pxTypedef.h"

#include "./pxtnWoice.h"
#include "./pxtnEvelist.h"

static bool _malloc_zero( void **pp, long size )
{
	*pp = malloc( size ); if( !( *pp ) ) return false;
	memset( *pp, 0, size );              return true ;
}

static void _free_null( void **pp )
{
	if( *pp ){ free( *pp ); *pp = NULL; }
}


pxtnWoice::pxtnWoice()
{
	_voice_num = 0;
	memset( _name, 0, sizeof(_name) );
	_type = pxtnWOICE_None;
	_vcs  = NULL    ;
	_vws  = NULL    ;
}

pxtnWoice::~pxtnWoice()
{
	Voice_Release();
//	if( _vcs ) free( _vcs ); _vcs = NULL;
//	if( _vws ) free( _vws ); _vws = NULL;
}

int         pxtnWoice::get_voice_num    () const{ return _voice_num    ; }
int         pxtnWoice::get_x3x_basic_key() const{ return _x3x_basic_key; }
float       pxtnWoice::get_x3x_correct  () const{ return _x3x_correct  ; }
pxtnWOICETYPE   pxtnWoice::get_type         () const{ return _type; }
const char *pxtnWoice::get_name         () const{ return _name; }

pxtnVOICEUNIT *pxtnWoice::get_voice_variable( int idx )
{
	if( idx < 0 || idx >= _voice_num ) return NULL;
	return &_vcs[ idx ];
}
const pxtnVOICEUNIT *pxtnWoice::get_voice( int idx ) const
{
	if( idx < 0 || idx >= _voice_num ) return NULL;
	return &_vcs[ idx ];
}
const pxtnVOICEWORK *pxtnWoice::get_work ( int idx ) const
{
	if( idx < 0 || idx >= _voice_num ) return NULL;
	return &_vws[ idx ];
}

void pxtnWoice::set_name( const char *name )
{
	unsigned int max_ = MAX_TUNEWOICENAME;
	if( strlen( name ) > max_ )
	{
		memcpy( _name, name, max_ );
		_name[ max_    ] = '\0';
		unsigned char c = _name[ max_ -1 ];
		bool b_zenkaku = false;
		if( c >= 0x81 && c <= 0x9F ) b_zenkaku = true;
		if( c >= 0xE0 && c <= 0xEF ) b_zenkaku = true;
		if( b_zenkaku ) _name[ max_ -1 ] = '\0';
	}
	else
	{
		strcpy( _name, name );
	}
}


static void _Voice_Release( pxtnVOICEUNIT* p_vc, pxtnVOICEWORK* p_vw )
{							
	if( p_vc )
	{
		SAFE_DELETE( p_vc->p_pcm  );
		SAFE_DELETE( p_vc->p_oggv );
		SAFE_DELETE( p_vc->p_ptn  );
		_free_null( (void**)&p_vc->envelope.points ); memset( &p_vc->envelope, 0, sizeof(pxtnVOICEENVELOPE) );
		_free_null( (void**)&p_vc->wave.points     ); memset( &p_vc->wave    , 0, sizeof(pxtnVOICEWAVE    ) );
	}
	if( p_vw )
	{
		_free_null( (void**)&p_vw->p_env           );
		_free_null( (void**)&p_vw->p_smp_w         );
		memset( p_vw, 0, sizeof(pxtnVOICEWORK) );
	}
}

void pxtnWoice::Voice_Release ()
{
	for( int v = 0; v < _voice_num; v++ ) _Voice_Release( &_vcs[ v ], &_vws[ v ] );
	_free_null( (void**)&_vcs );
	_free_null( (void**)&_vws );
	_voice_num = 0;
}

void pxtnWoice::Slim()
{
	for( int i = _voice_num - 1; i >= 0; i-- )
	{
		bool b_remove = false;

		if( !_vcs[ i ].volume ) b_remove = true;

		if( _vcs[ i ].type == pxtnVOICE_Coodinate && _vcs[ i ].wave.num <= 1 ) b_remove = true;

		if( b_remove )
		{
			_Voice_Release( &_vcs[ i ], &_vws[ i ] );
			_voice_num--;
			for( int j = i; j < _voice_num; j++ ) _vcs[ j ] = _vcs[ j + 1 ];
			memset( &_vcs[ _voice_num ], 0, sizeof(pxtnVOICEUNIT) );
		}
	}
}


bool pxtnWoice::Voice_Allocate( long voice_num )
{
	bool b_ret = false;

	Voice_Release();

	if( !_malloc_zero( (void**)&_vcs, sizeof(pxtnVOICEUNIT) * voice_num ) ) goto End;
	if( !_malloc_zero( (void**)&_vws, sizeof(pxtnVOICEWORK) * voice_num ) ) goto End;
	_voice_num = voice_num;

	for( int i = 0; i < voice_num; i++ )
	{
		pxtnVOICEUNIT *p_vc = &_vcs[ i ];
		p_vc->basic_key   = EVENTDEFAULT_BASICKEY;
		p_vc->volume      = 128;
		p_vc->pan         =  64;
		p_vc->correct     =   1;
		p_vc->voice_flags = PTV_VOICEFLAG_SMOOTH;
		p_vc->data_flags  = PTV_DATAFLAG_WAVE;
		p_vc->p_pcm       = new pxPulse_PCM  ();
		p_vc->p_oggv      = new pxPulse_Oggv ();
		p_vc->p_ptn       = new pxPulse_Noise();
		memset( &p_vc->envelope, 0, sizeof(pxtnVOICEENVELOPE) );
	}

	b_ret = true;
End:

	if( !b_ret )Voice_Release();

	return b_ret;
}

bool pxtnWoice::Copy( pxtnWoice *p_dst ) const
{
	bool             b_ret = false;
	long             v, size, num;
	pxtnVOICEUNIT* p_vc1;
	pxtnVOICEUNIT* p_vc2;

	if( !p_dst->Voice_Allocate( _voice_num ) ) goto End;

	p_dst->_type = _type;
	strcpy( p_dst->_name, _name );

	for( v = 0; v < _voice_num; v++ )
	{
		p_vc1 = &       _vcs[ v ];
		p_vc2 = &p_dst->_vcs[ v ];

		p_vc2->correct           = p_vc1->correct    ;
		p_vc2->data_flags        = p_vc1->data_flags ;
		p_vc2->basic_key         = p_vc1->basic_key  ;
		p_vc2->pan               = p_vc1->pan        ;
		p_vc2->type              = p_vc1->type       ;
		p_vc2->voice_flags       = p_vc1->voice_flags;
		p_vc2->volume            = p_vc1->volume     ;


		// envelope
		p_vc2->envelope.body_num = p_vc1->envelope.body_num;
		p_vc2->envelope.fps      = p_vc1->envelope.fps     ;
		p_vc2->envelope.head_num = p_vc1->envelope.head_num;
		p_vc2->envelope.tail_num = p_vc1->envelope.tail_num;
		num  = p_vc2->envelope.head_num + p_vc2->envelope.body_num + p_vc2->envelope.tail_num;
		size = sizeof(s32POINT) * num;
		if( !_malloc_zero( (void **)&p_vc2->envelope.points, size ) ) goto End;
		memcpy(                      p_vc2->envelope.points, p_vc1->envelope.points, size );

		// wave
		p_vc2->wave.num          = p_vc1->wave.num ;
		p_vc2->wave.reso         = p_vc1->wave.reso;
		size = sizeof(s32POINT) * p_vc2->wave.num;
		if( !_malloc_zero( (void **)&p_vc2->wave.points, size ) ) goto End;
		memcpy(                      p_vc2->wave.points    , p_vc1->wave.points    , size );

//		if( !p_vc1->p_ptv ->Copy( p_vc2->p_ptv  ) ) goto End;
		if( !p_vc1->p_pcm ->Copy( p_vc2->p_pcm  ) ) goto End;
		if( !p_vc1->p_ptn ->Copy( p_vc2->p_ptn  ) ) goto End;
		if( !p_vc1->p_oggv->Copy( p_vc2->p_oggv ) ) goto End;
	}

	b_ret = true;
End:
	if( !b_ret ) p_dst->Voice_Release();

	return b_ret;
}

/*
void pxtnWoice::_TuneVoiceDefault( pxtnVOICEUNIT *p_vc )
{
	p_vc->basic_key     = EVENTDEFAULT_BASICKEY;
	p_vc->volume        = 128;
	p_vc->pan           =  64;
	p_vc->correct       =   1;
	p_vc->voice_flags   = PTV_VOICEFLAG_SMOOTH;
	p_vc->data_flags    = PTV_DATAFLAG_WAVE;

//	p_vc->p_ptv->Envelope_Zero();
	memset( &p_vc->envelope, 0, sizeof(pxtnVOICEENVELOPE) );
}
*/
bool pxtnWoice::Load( const char *path, pxtnWOICETYPE type, bool *pb_new_fmt )
{
	bool b_ret = false;

	switch( type )
	{
	// PCM
	case pxtnWOICE_PCM:
		{
			pxtnVOICEUNIT *p_vc; if( !Voice_Allocate( 1 ) ) goto End; p_vc = &_vcs[ 0 ]; p_vc->type = pxtnVOICE_Sampling;
			if( !p_vc->p_pcm->Load( path ) ) goto End;
			// if under 0.005 sec, set LOOP.
			if(p_vc->p_pcm->get_sec() < 0.005f ) p_vc->voice_flags |=  PTV_VOICEFLAG_WAVELOOP;
			else                                 p_vc->voice_flags &= ~PTV_VOICEFLAG_WAVELOOP;
			_type      = pxtnWOICE_PCM;
			break;
		}

	// PTV
	case pxtnWOICE_PTV:
		{
			pxwrDoc doc;
			if( !doc.Open_path( path, "rb" )  ) goto End;
			if( !PTV_Read( &doc, pb_new_fmt ) ) goto End;
			break;
		}

	// PTN
	case pxtnWOICE_PTN:
		{
			pxwrDoc doc;
			pxtnVOICEUNIT *p_vc; if( !Voice_Allocate( 1 ) ) goto End; p_vc = &_vcs[ 0 ]; p_vc->type = pxtnVOICE_Noise;
			if( !doc.Open_path( path, "rb" )           ) goto End;
			if( !p_vc->p_ptn->Read( &doc, pb_new_fmt ) ) goto End;
			_type      = pxtnWOICE_PTN;
			break;
		}

	// OGGV
	case pxtnWOICE_OGGV:
		{
			pxtnVOICEUNIT *p_vc; if( !Voice_Allocate( 1 ) ) goto End; p_vc = &_vcs[ 0 ]; p_vc->type = pxtnVOICE_OggVorbis;
			if( !p_vc->p_oggv->Load( path ) ) goto End;
			_type      = pxtnWOICE_OGGV;
			break;
		}

	default: goto End;
	}

	b_ret = true;
End:

	return b_ret;
}








static void _UpdateWavePTV( pxtnVOICEUNIT* p_vc, pxtnVOICEWORK* p_vw, long ch, long sps, long bps )
{
	double work, osc;
	long   long_;
	long   pan_volume[ 2 ] = {64, 64};
	bool   b_ovt;

	pxPulse_Oscillator osci;

	if( ch == 2 )
	{
		if( p_vc->pan > 64 ) pan_volume[ 0 ] = ( 128 - p_vc->pan );
		if( p_vc->pan < 64 ) pan_volume[ 1 ] = (       p_vc->pan );
	}

	osci.ReadyGetSample( p_vc->wave.points, p_vc->wave.num, p_vc->volume, p_vw->smp_body_w, p_vc->wave.reso );

	if( p_vc->type == pxtnVOICE_Overtone ) b_ovt = true ;
	else                                   b_ovt = false; 

	//  8bit
	if( bps ==  8 )
	{
		unsigned char* p = (unsigned char *)p_vw->p_smp_w;
		for( int s = 0; s < p_vw->smp_body_w; s++ )
		{
			if( b_ovt ) osc = osci.GetOneSample_Overtone ( s );
			else        osc = osci.GetOneSample_Coodinate( s );
			for( int c = 0; c < ch; c++ )
			{
				work = osc * pan_volume[ c ] / 64;
				if( work >  1.0 ) work =  1.0;
				if( work < -1.0 ) work = -1.0;
				long_  = (long)( work * 127 );
				p[ s * ch + c ] = (unsigned char)(long_ + 128);
			}
		}

	// 16bit
	}
	else
	{
		short* p = (short *)p_vw->p_smp_w;
		for( int s = 0; s < p_vw->smp_body_w; s++ )
		{
			if( b_ovt ) osc = osci.GetOneSample_Overtone ( s );
			else        osc = osci.GetOneSample_Coodinate( s );
			for( int c = 0; c < ch; c++ )
			{
				work = osc * pan_volume[ c ] / 64;
				if( work >  1.0 ) work =  1.0;
				if( work < -1.0 ) work = -1.0;
				long_  = (long)( work * 32767 );
				p[ s * ch + c ] = (short)long_;
			}
		}
	}
}

bool pxtnWoice::Tone_Ready_sample( const pxPulse_NoiseBuilder *ptn_bldr )
{
	bool             b_ret = false;
	pxtnVOICEWORK* p_vw;
	pxtnVOICEUNIT* p_vc;
	pxPulse_PCM      pcm_work;

	long ch  =     2;
	long sps = 44100;
	long bps =    16;

	for( int v = 0; v < _voice_num; v++ )
	{
		p_vw = &_vws[ v ];
		_free_null( (void **)&p_vw->p_smp_w );
		p_vw->smp_head_w = 0;
		p_vw->smp_body_w = 0;
		p_vw->smp_tail_w = 0;
	}

	for( int v = 0; v < _voice_num; v++ )
	{
		p_vw = &_vws[ v ];
		p_vc = &_vcs[ v ];

		switch( p_vc->type )
		{
		case pxtnVOICE_OggVorbis:

			if( !p_vc->p_oggv->Decode( &pcm_work ) ) goto End;
			if( !pcm_work.Convert( ch, sps, bps  ) ) goto End;
			p_vw->smp_head_w = pcm_work.get_smp_head();
			p_vw->smp_body_w = pcm_work.get_smp_body();
			p_vw->smp_tail_w = pcm_work.get_smp_tail();
			p_vw->p_smp_w    = (unsigned char*)pcm_work.Devolve_SamplingBuffer();
			break;

		case pxtnVOICE_Sampling:

			if( !p_vc->p_pcm->Copy( &pcm_work ) ) goto End;
			if( !pcm_work.Convert( ch, sps, bps ) ) goto End;
			p_vw->smp_head_w = pcm_work.get_smp_head();
			p_vw->smp_body_w = pcm_work.get_smp_body();
			p_vw->smp_tail_w = pcm_work.get_smp_tail();
			p_vw->p_smp_w    = (unsigned char*)pcm_work.Devolve_SamplingBuffer();
			break;

		case pxtnVOICE_Overtone :
		case pxtnVOICE_Coodinate:
			{
				p_vw->smp_body_w =  400;
				int size = p_vw->smp_body_w * ch * bps / 8;
				if( !( p_vw->p_smp_w = (unsigned char *)malloc( size ) ) ) goto End;
				memset( p_vw->p_smp_w, 0x00, size );
				_UpdateWavePTV( p_vc, p_vw, ch, sps, bps );
				break;
			}

		case pxtnVOICE_Noise:
			{
				pxPulse_PCM *p_pcm = NULL;
				if( !ptn_bldr ) goto End;
				if( !( p_pcm = ptn_bldr->BuildNoise( p_vc->p_ptn, ch, sps, bps ) ) ) goto End;
				p_vw->p_smp_w = (unsigned char*)p_pcm->Devolve_SamplingBuffer();
				p_vw->smp_body_w = p_vc->p_ptn->get_smp_num_44k();
				break;
			}
		}
	}

	b_ret = true;
End:
	if( !b_ret )
	{
		for( int v = 0; v < _voice_num; v++ )
		{
			p_vw = &_vws[ v ];
			_free_null( (void **)&p_vw->p_smp_w );
			p_vw->smp_head_w = 0;
			p_vw->smp_body_w = 0;
			p_vw->smp_tail_w = 0;
		}
	}

	return b_ret;
}


bool pxtnWoice::Tone_Ready_envelope( int sps )
{
	bool b_ret = false;
	int  e;

	s32POINT *p_point = NULL;

	for( int v = 0; v < _voice_num; v++ )
	{
		pxtnVOICEWORK    *p_vw   = &_vws[ v ];
		pxtnVOICEUNIT    *p_vc   = &_vcs[ v ];
		pxtnVOICEENVELOPE *p_enve = &p_vc->envelope;
		int                size  = 0;

		_free_null( (void**)&p_vw->p_env );

		if( p_enve->head_num )
		{
			for( e = 0; e < p_enve->head_num; e++ ) size += p_enve->points[ e ].x;
			p_vw->env_size = (long)( (double)size * sps / p_enve->fps );
			if( !p_vw->env_size ) p_vw->env_size = 1;

			if( !_malloc_zero( (void**)&p_vw->p_env, p_vw->env_size                      ) ) goto End;
			if( !_malloc_zero( (void**)&p_point    , sizeof(s32POINT) * p_enve->head_num ) ) goto End;

			// convert points.
			long offset   = 0;
			long head_num = 0;
			for( e = 0; e < p_enve->head_num; e++ )
			{
				if( !e || p_enve->points[ e ].x || p_enve->points[ e ].y )
				{
					offset        += (long)( (double)p_enve->points[ e ].x * sps / p_enve->fps );
					p_point[ e ].x = offset;
					p_point[ e ].y =                 p_enve->points[ e ].y;
					head_num++;
				}
			}

			s32POINT start;
			e = start.x = start.y = 0;
			for( long s = 0; s < p_vw->env_size; s++ )
			{
				while( e < head_num && s >= p_point[ e ].x )
				{
					start.x = p_point[ e ].x;
					start.y = p_point[ e ].y;
					e++;
				}

				if(    e < head_num )
				{
					p_vw->p_env[ s ] = (unsigned char)(
												start.y + ( p_point[ e ].y - start.y ) *
												(              s - start.x ) /
												( p_point[ e ].x - start.x )
											);
				}
				else
				{
					p_vw->p_env[ s ] = (unsigned char)start.y;
				}
			}

			_free_null( (void**)&p_point );
		}

		if( p_enve->tail_num )
		{
			p_vw->env_release = (long)( (double)p_enve->points[ p_enve->head_num ].x * sps / p_enve->fps );
		}
		else 
		{
			p_vw->env_release = 0;
		}
	}

	b_ret = true;
End:

	_free_null( (void**)&p_point );

	if( !b_ret ){ for( int v = 0; v < _voice_num; v++ ) _free_null( (void**)&_vws[ v ].p_env ); }

	return b_ret;
}

bool pxtnWoice::Tone_Ready(  const pxPulse_NoiseBuilder *ptn_bldr, int sps )
{
	if( !Tone_Ready_sample  ( ptn_bldr ) ) return false;
	if( !Tone_Ready_envelope( sps      ) ) return false;
	return true;
}

