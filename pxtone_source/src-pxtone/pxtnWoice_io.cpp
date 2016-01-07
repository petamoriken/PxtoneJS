// '12/03/06

#include <stdio.h>
#include <string.h>

#include "./pxtnWoice.h"



//////////////////////
// matePCM
//////////////////////

// 24byte =================
typedef struct
{
	unsigned short x3x_unit_no;
	unsigned short basic_key;
	unsigned long  voice_flags;
	unsigned short ch ;
	unsigned short bps;
	unsigned long  sps;
	float          correct;
	unsigned long  data_size;
}
_MATERIALSTRUCT_PCM;

bool pxtnWoice::io_matePCM_w( pxwrDoc *p_doc ) const
{
	const pxPulse_PCM   *p_pcm =  _vcs[ 0 ].p_pcm;
	pxtnVOICEUNIT     *p_vc  = &_vcs[ 0 ];
	_MATERIALSTRUCT_PCM pcm;
 
	memset( &pcm, 0, sizeof( _MATERIALSTRUCT_PCM ) );

	pcm.sps         = (unsigned long )p_pcm->get_sps     ();
	pcm.bps         = (unsigned short)p_pcm->get_bps     ();
	pcm.ch          = (unsigned short)p_pcm->get_ch      ();
	pcm.data_size   = (unsigned long )p_pcm->get_buf_size();
	pcm.x3x_unit_no = (unsigned short)0;
	pcm.correct     =                 p_vc->correct;
	pcm.voice_flags =                 p_vc->voice_flags;
	pcm.basic_key   = (unsigned short)p_vc->basic_key;

	unsigned long size = sizeof( _MATERIALSTRUCT_PCM ) + pcm.data_size;
	if( !p_doc->w( &size, sizeof(unsigned long      ), 1 ) ) return false;
	if( !p_doc->w( &pcm , sizeof(_MATERIALSTRUCT_PCM), 1 ) ) return false;
	if( !p_doc->w( p_pcm->get_p_buf(), 1, pcm.data_size  ) ) return false;

	return true;
}

bool pxtnWoice::io_matePCM_r( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	bool                b_ret = false;
	_MATERIALSTRUCT_PCM pcm;
	long                size;

	if( !p_doc->r( &size, 4,                            1 ) ) return false;
	if( !p_doc->r( &pcm, sizeof( _MATERIALSTRUCT_PCM ), 1 ) ) return false;

	if( ((long)pcm.voice_flags) & PTV_VOICEFLAG_UNCOVERED ){ *pb_new_fmt = true; return false; }

	if( !Voice_Allocate( 1 ) ) goto End;

	{
		pxtnVOICEUNIT* p_vc = &_vcs[ 0 ];

		p_vc->type = pxtnVOICE_Sampling;

		if( !p_vc->p_pcm->Make( pcm.ch, pcm.sps, pcm.bps, pcm.data_size / ( pcm.bps / 8 * pcm.ch ) ) ) goto End;

		if( !p_doc->r( p_vc->p_pcm->get_p_buf_variable(), 1, pcm.data_size ) ) goto End;

		_type      = pxtnWOICE_PCM;

		p_vc->voice_flags  = pcm.voice_flags;
		p_vc->basic_key    = pcm.basic_key  ;
		p_vc->correct      = pcm.correct    ;
		_x3x_basic_key     = pcm.basic_key  ;
		_x3x_correct       = 0;
	}
	b_ret = true;
End:

	if( !b_ret ) Voice_Release();

	return b_ret;
}


/////////////
// matePTN
/////////////

// 16byte =================
typedef struct
{
	unsigned short x3x_unit_no;
	unsigned short basic_key;
	unsigned long  voice_flags;
	float          correct;
	long           rrr; // 0: -v.0.9.2.3
	                    // 1:  v.0.9.2.4-
}
_MATERIALSTRUCT_PTN;

bool pxtnWoice::io_matePTN_w( pxwrDoc *p_doc ) const
{
	_MATERIALSTRUCT_PTN ptn;
	pxtnVOICEUNIT*    p_vc;
	long                size = 0;

	// ptv -------------------------
	memset( &ptn, 0, sizeof( _MATERIALSTRUCT_PTN ) );
	ptn.x3x_unit_no   = (unsigned short)0;

	p_vc = &_vcs[ 0 ];
	ptn.correct       =                 p_vc->correct;
	ptn.voice_flags   =                 p_vc->voice_flags;
	ptn.basic_key     = (unsigned short)p_vc->basic_key;
	ptn.rrr           = 1;

	// pre
	if( !p_doc->w( &size, sizeof(long),                1 ) ) return false;
	if( !p_doc->w( &ptn,  sizeof(_MATERIALSTRUCT_PTN), 1 ) ) return false;
	size += sizeof(_MATERIALSTRUCT_PTN);
	if( !p_vc->p_ptn->Write( p_doc, &size )                ) return false;
	if( !p_doc->Seek( SEEK_CUR, -size - sizeof(long) )     ) return false;

	//
	if( !p_doc->w( &size, sizeof(long),                1 ) ) return false;
	if( !p_doc->Seek( SEEK_CUR, size )                     ) return false;

	return true;
}


bool pxtnWoice::io_matePTN_r( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	bool                b_ret = false; 
	_MATERIALSTRUCT_PTN ptn;
	long                size;

	if( !p_doc->r( &size, sizeof(long),                  1 ) ) return false;
	if( !p_doc->r( &ptn,  sizeof( _MATERIALSTRUCT_PTN ), 1 ) ) return false;

	if     ( ptn.rrr > 1 ){ *pb_new_fmt = true; return false; }
	else if( ptn.rrr < 0 ) return false;

	if( !Voice_Allocate( 1 ) ) goto End;

	{
		pxtnVOICEUNIT *p_vc = &_vcs[ 0 ];

		p_vc->type = pxtnVOICE_Noise;
		if( !p_vc->p_ptn->Read( p_doc, pb_new_fmt ) ) goto End;
		_type      = pxtnWOICE_PTN;

		p_vc->voice_flags  = ptn.voice_flags;
		p_vc->basic_key    = ptn.basic_key;
		p_vc->correct      = ptn.correct;
	}

	_x3x_basic_key = ptn.basic_key;
	_x3x_correct   = 0;

	b_ret = true;
End:
	if( !b_ret ) Voice_Release();

	return b_ret;
}

/////////////////
// matePTV
/////////////////

// 24byte =================
typedef struct
{
	unsigned short x3x_unit_no;
	unsigned short rrr;
	float          x3x_correct;
	int            size;
}
_MATERIALSTRUCT_PTV;

bool pxtnWoice::io_matePTV_w( pxwrDoc *p_doc ) const
{
	_MATERIALSTRUCT_PTV ptv;
	long                head_size = sizeof(_MATERIALSTRUCT_PTV) + sizeof(long);
	long                size = 0;

	// ptv -------------------------
	memset( &ptv, 0, sizeof( _MATERIALSTRUCT_PTV ) );
	ptv.x3x_unit_no = (unsigned short)0;
	ptv.x3x_correct = 0;//1.0f;//p_w->correct;
	ptv.size        = 0;

	// pre write
	if( !p_doc->w( &size, sizeof(long),                1 ) ) return false;
	if( !p_doc->w( &ptv,  sizeof(_MATERIALSTRUCT_PTV), 1 ) ) return false;
	if( !PTV_Write( p_doc, &ptv.size )       ) return false;

	if( !p_doc->Seek( SEEK_CUR, -( ptv.size + head_size ) ) ) return false;

	size = ptv.size +  sizeof(_MATERIALSTRUCT_PTV);
	if( !p_doc->w( &size, sizeof(long),                1 ) ) return false;
	if( !p_doc->w( &ptv,  sizeof(_MATERIALSTRUCT_PTV), 1 ) ) return false;

	if( !p_doc->Seek( SEEK_CUR, ptv.size )                 ) return false;

	return true;
}

bool pxtnWoice::io_matePTV_r( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	bool                b_ret = false;
	_MATERIALSTRUCT_PTV ptv;
	long                size;

	if( !p_doc->r( &size, sizeof(long),                  1 ) ) return false;
	if( !p_doc->r( &ptv,  sizeof( _MATERIALSTRUCT_PTV ), 1 ) ) return false;

	if( ptv.rrr ){ *pb_new_fmt = true; return false; }

	if( !PTV_Read( p_doc, pb_new_fmt ) ) goto End;

	if( ptv.x3x_correct != 1.0 ) _x3x_correct = ptv.x3x_correct;
	else                         _x3x_correct = 0;

	b_ret = true;
End:

	return b_ret;
}



//////////////////////
// mateOGGV
//////////////////////

// 16byte =================
typedef struct
{
	unsigned short xxx;       //ch;
	unsigned short basic_key;
	unsigned long  voice_flags;
	float          correct;
}
_MATERIALSTRUCT_OGGV;

bool pxtnWoice::io_mateOGGV_w( pxwrDoc *p_doc ) const
{
	if( !_vcs ) return false;

	pxtnVOICEUNIT* p_vc = &_vcs[ 0 ];

	if( !p_vc->p_oggv ) return false;

	int oggv_size = p_vc->p_oggv->GetSize();
	
	_MATERIALSTRUCT_OGGV mate;

	memset( &mate, 0, sizeof( _MATERIALSTRUCT_OGGV ) );

	mate.correct     =                 p_vc->correct    ;
	mate.voice_flags =                 p_vc->voice_flags;
	mate.basic_key   = (unsigned short)p_vc->basic_key  ;

	unsigned long size = sizeof( _MATERIALSTRUCT_OGGV ) + oggv_size;
	if( !p_doc->w( &size, sizeof(unsigned long)       ,   1 ) ) return false;
	if( !p_doc->w( &mate, sizeof(_MATERIALSTRUCT_OGGV),   1 ) ) return false;
	if( !p_vc->p_oggv->Write( p_doc ) ) return false;

	return true;
}

bool pxtnWoice::io_mateOGGV_r( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	bool                 b_ret = false;
	_MATERIALSTRUCT_OGGV mate;
	long                 size;

	if( !p_doc->r( &size, 4,                              1 ) ) return false;
	if( !p_doc->r( &mate, sizeof( _MATERIALSTRUCT_OGGV ), 1 ) ) return false;

	if( ((long)mate.voice_flags) & PTV_VOICEFLAG_UNCOVERED ){ *pb_new_fmt = true; return false; }

	if( !Voice_Allocate( 1 ) ) goto End;

	{
		pxtnVOICEUNIT *p_vc = &_vcs[ 0 ];
		p_vc->type = pxtnVOICE_OggVorbis;

		if( !p_vc->p_oggv->Read( p_doc ) ) goto End;

		p_vc->voice_flags  = mate.voice_flags;
		p_vc->basic_key    = mate.basic_key  ;
		p_vc->correct      = mate.correct    ;
	}
	
	_x3x_basic_key     = mate.basic_key  ;
	_x3x_correct       =                0;
	_type              = pxtnWOICE_OGGV  ;

	b_ret = true;
End:
	if( !b_ret ) Voice_Release();

	return b_ret;
}
