// '12/03/03

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "./pxtnWoice.h"

//                           01234567
static const char *_code  = "PTVOICE-";
//static long _version =  20050826;
//static long _version =  20051101; // support coodinate
static long _version   =  20060111; // support no-envelope

static bool _malloc_zero( void **pp, long size )
{
	*pp = malloc( size ); if( !( *pp ) ) return false;
	memset( *pp, 0, size );              return true;
}


static bool _Write_Wave( pxwrDoc *p_doc, const pxtnVOICEUNIT *p_vc, int *p_total )
{
	bool b_ret = false;
	long num, i, size;
	char          sc;
	unsigned char uc;

	if( !p_doc->v_w( p_vc->type, p_total ) ) goto End;

	switch( p_vc->type )
	{
	// Coodinate (3)
	case pxtnVOICE_Coodinate:
		if( !p_doc->v_w( p_vc->wave.num , p_total ) ) goto End;
		if( !p_doc->v_w( p_vc->wave.reso, p_total ) ) goto End;
		num = p_vc->wave.num;
		for( i = 0; i < num; i++ )
		{
			uc = (char)p_vc->wave.points[ i ].x; if( !p_doc->w( &uc, 1, 1 ) ) goto End; (*p_total)++;
			sc = (char)p_vc->wave.points[ i ].y; if( !p_doc->w( &sc, 1, 1 ) ) goto End; (*p_total)++;
		}
		break;

	// Overtone (2)
	case pxtnVOICE_Overtone:

		if( !p_doc->v_w( p_vc->wave.num, p_total ) ) goto End;
		num = p_vc->wave.num;
		for( i = 0; i < num; i++ )
		{
			if( !p_doc->v_w( p_vc->wave.points[ i ].x, p_total ) ) goto End;
			if( !p_doc->v_w( p_vc->wave.points[ i ].y, p_total ) ) goto End;
		}
		break;

	// sampling (7)
	case pxtnVOICE_Sampling:
		if( !p_doc->v_w( p_vc->p_pcm->get_ch      (), p_total ) ) goto End;
		if( !p_doc->v_w( p_vc->p_pcm->get_bps     (), p_total ) ) goto End;
		if( !p_doc->v_w( p_vc->p_pcm->get_sps     (), p_total ) ) goto End;
		if( !p_doc->v_w( p_vc->p_pcm->get_smp_head(), p_total ) ) goto End;
		if( !p_doc->v_w( p_vc->p_pcm->get_smp_body(), p_total ) ) goto End;
		if( !p_doc->v_w( p_vc->p_pcm->get_smp_tail(), p_total ) ) goto End;

		size = p_vc->p_pcm->get_buf_size();

		if( !p_doc->w( p_vc->p_pcm->get_p_buf(), 1, size )      ) goto End;
		*p_total += size;
		break;
			
		case pxtnVOICE_OggVorbis: goto End; // not support.
	}

	b_ret = true;
End:

	return b_ret;
}

static bool _Write_Envelope( pxwrDoc *p_doc, const pxtnVOICEUNIT *p_vc, int *p_total )
{
	bool b_ret = false;
	long num, i;

	// envelope. (5)
	if( !p_doc->v_w( p_vc->envelope.fps,      p_total ) ) goto End;
	if( !p_doc->v_w( p_vc->envelope.head_num, p_total ) ) goto End;
	if( !p_doc->v_w( p_vc->envelope.body_num, p_total ) ) goto End;
	if( !p_doc->v_w( p_vc->envelope.tail_num, p_total ) ) goto End;

	num = p_vc->envelope.head_num + p_vc->envelope.body_num + p_vc->envelope.tail_num;
	for( i = 0; i < num; i++ )
	{
		if( !p_doc->v_w( p_vc->envelope.points[ i ].x, p_total ) ) goto End;
		if( !p_doc->v_w( p_vc->envelope.points[ i ].y, p_total ) ) goto End;
	}

	b_ret = true;
End:

	return b_ret;
}



static bool _Read_Wave( pxwrDoc *p_doc, pxtnVOICEUNIT *p_vc )
{
	bool b_ret = false;
	long i, num;
	char          sc;
	unsigned char uc;

	if( !p_doc->v_r( (int*)&p_vc->type ) ) goto End;

	switch( p_vc->type )
	{
	// coodinate (3)
	case pxtnVOICE_Coodinate:
		if( !p_doc->v_r( &p_vc->wave.num  ) ) goto End;
		if( !p_doc->v_r( &p_vc->wave.reso ) ) goto End;
		num = p_vc->wave.num;
		if( !_malloc_zero( (void **)&p_vc->wave.points, sizeof(s32POINT) * num ) ) goto End;
		for( i = 0; i < num; i++ )
		{
			if( !p_doc->r( &uc, 1, 1 ) ) goto End; p_vc->wave.points[ i ].x = uc;
			if( !p_doc->r( &sc, 1, 1 ) ) goto End; p_vc->wave.points[ i ].y = sc;
		}
		num = p_vc->wave.num;
		break;
	// overtone (2)
	case pxtnVOICE_Overtone:

		if( !p_doc->v_r( &p_vc->wave.num ) ) goto End;
		num = p_vc->wave.num;
		if( !_malloc_zero( (void **)&p_vc->wave.points, sizeof(s32POINT) * num ) ) goto End;
		for( i = 0; i < num; i++ )
		{
			if( !p_doc->v_r( (int*)&p_vc->wave.points[ i ].x ) ) goto End;
			if( !p_doc->v_r( (int*)&p_vc->wave.points[ i ].y ) ) goto End;
		}
		break;

	// p_vc->sampring. (7)
	case pxtnVOICE_Sampling:
		{

		goto End; // un-support

		//if( !p_doc->v_r( &p_vc->pcm.ch       ) ) goto End;
		//if( !p_doc->v_r( &p_vc->pcm.bps      ) ) goto End;
		//if( !p_doc->v_r( &p_vc->pcm.sps      ) ) goto End;
		//if( !p_doc->v_r( &p_vc->pcm.smp_head ) ) goto End;
		//if( !p_doc->v_r( &p_vc->pcm.smp_body ) ) goto End;
		//if( !p_doc->v_r( &p_vc->pcm.smp_tail ) ) goto End;
		//size = ( p_vc->pcm.smp_head + p_vc->pcm.smp_body + p_vc->pcm.smp_tail ) * p_vc->pcm.ch * p_vc->pcm.bps / 8;
		//if( !_malloc_zero( (void **)&p_vc->pcm.p_smp,    size )          ) goto End;
		//if( !p_doc->r(        p_vc->pcm.p_smp, 1, size ) ) goto End;

		//break;
		}

	default:
		goto End; // un-support
	}
	b_ret = true;
End:

	return b_ret;

}

static bool _Read_Envelope( pxwrDoc *p_doc, pxtnVOICEUNIT *p_vc )
{
	bool b_ret = false;
	long num, i;

	//p_vc->envelope. (5)
	if( !p_doc->v_r( &p_vc->envelope.fps      ) ) goto End;
	if( !p_doc->v_r( &p_vc->envelope.head_num ) ) goto End;
	if( !p_doc->v_r( &p_vc->envelope.body_num ) ) goto End;
	if( !p_doc->v_r( &p_vc->envelope.tail_num ) ) goto End;

	if( p_vc->envelope.body_num      ) goto End; // no support
	if( p_vc->envelope.tail_num != 1 ) goto End; // no suport

	num = p_vc->envelope.head_num + p_vc->envelope.body_num + p_vc->envelope.tail_num;
	if( !_malloc_zero( (void **)&p_vc->envelope.points,            sizeof(s32POINT) * num ) ) goto End;
	for( i = 0; i < num; i++ )
	{
		if( !p_doc->v_r( (int*)&p_vc->envelope.points[ i ].x ) ) goto End;
		if( !p_doc->v_r( (int*)&p_vc->envelope.points[ i ].y ) ) goto End;
	}

	b_ret = true;
End:

	return b_ret;

}


////////////////////////
// pubics..
////////////////////////

bool pxtnWoice::PTV_Write( pxwrDoc *p_doc, int *p_total ) const

{
	bool            b_ret = false;
	pxtnVOICEUNIT *p_vc = NULL ;
	unsigned long   work;
	long            v;
	int             total =     0;

	if( !p_doc->w( _code,                         1, 8 ) ) goto End;
	if( !p_doc->w( &_version, sizeof(unsigned long), 1 ) ) goto End;
	if( !p_doc->w( &total,    sizeof(long),          1 ) ) goto End;

	work = 0;

	// p_ptv-> (5)
	if( !p_doc->v_w( work,       &total ) ) goto End; // basic_key (no use)
	if( !p_doc->v_w( work,       &total ) ) goto End;
	if( !p_doc->v_w( work,       &total ) ) goto End;
	if( !p_doc->v_w( _voice_num, &total ) ) goto End;

	for( v = 0; v < _voice_num; v++ )
	{
		// p_ptvv-> (9)
		p_vc = &_vcs[ v ];
		if( !p_vc ) goto End;

		if( !p_doc->v_w( p_vc->basic_key  , &total ) ) goto End;
		if( !p_doc->v_w( p_vc->volume     , &total ) ) goto End;
		if( !p_doc->v_w( p_vc->pan        , &total ) ) goto End;
		memcpy( &work, &p_vc->correct, sizeof( 4 ) );
		if( !p_doc->v_w( work             , &total ) ) goto End;
		if( !p_doc->v_w( p_vc->voice_flags, &total ) ) goto End;
		if( !p_doc->v_w( p_vc->data_flags , &total ) ) goto End;

		if( p_vc->data_flags & PTV_DATAFLAG_WAVE     && !_Write_Wave(     p_doc, p_vc, &total ) ) goto End;
		if( p_vc->data_flags & PTV_DATAFLAG_ENVELOPE && !_Write_Envelope( p_doc, p_vc, &total ) ) goto End;
	}

	// total size
	if( !p_doc->Seek( SEEK_CUR, -(total + 4) ) ) goto End;
	if( !p_doc->w( &total, sizeof(long), 1 )   ) goto End;
	if( !p_doc->Seek( SEEK_CUR,  (total    ) ) ) goto End;

	if( p_total ) *p_total = 16 + total;
	b_ret  = true;
End:
	
	return b_ret;
}



bool pxtnWoice::PTV_Read( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	bool            b_ret = false;
	pxtnVOICEUNIT *p_vc = NULL ;
	unsigned char   code[ 8 ];
	long            version      ;
	int             work1, work2 ;
	int             total, num   ;

	if( !p_doc->r( code,                1, 8 ) ) goto End;
	if( !p_doc->r( &version, sizeof(long), 1 ) ) goto End;
	if( memcmp( code, _code, 8 )               ) goto End;
	if( !p_doc->r( &total,   sizeof(long), 1 ) ) goto End;

	if( version > _version ){ *pb_new_fmt = true; goto End; }

	// p_ptv-> (5)
	if( !p_doc->v_r( &_x3x_basic_key ) ) goto End; // old "p_w->basic_key"
	if( !p_doc->v_r( &work1          ) ) goto End;
	if( !p_doc->v_r( &work2          ) ) goto End;
	if( work1 || work2 ){ *pb_new_fmt = true; goto End; }
	if( !p_doc->v_r    ( &num ) ) goto End;
	if( !Voice_Allocate(  num ) ) goto End;

	for( int v = 0; v < _voice_num; v++ )
	{
		// p_ptvv-> (8)
		p_vc = &_vcs[ v ];
		if( !p_vc                           ) goto End;
		if( !p_doc->v_r( &p_vc->basic_key ) ) goto End;
		if( !p_doc->v_r( &p_vc->volume    ) ) goto End;
		if( !p_doc->v_r( &p_vc->pan       ) ) goto End;
		if( !p_doc->v_r( &work1           ) ) goto End;
		memcpy( &p_vc->correct, &work1, sizeof( 4 ) );
		if( !p_doc->v_r( (int*)&p_vc->voice_flags ) ) goto End;
		if( !p_doc->v_r( (int*)&p_vc->data_flags  ) ) goto End;

		// no support.
		if( p_vc->voice_flags & PTV_VOICEFLAG_UNCOVERED ){ *pb_new_fmt = true; goto End; }
		if( p_vc->data_flags  & PTV_DATAFLAG_UNCOVERED  ){ *pb_new_fmt = true; goto End; }
		if( p_vc->data_flags & PTV_DATAFLAG_WAVE        ){ if( !_Read_Wave(     p_doc, p_vc ) ) goto End; }
		if( p_vc->data_flags & PTV_DATAFLAG_ENVELOPE    ){ if( !_Read_Envelope( p_doc, p_vc ) ) goto End; }
	}
	_type = pxtnWOICE_PTV;

	b_ret = true;
End:

	return b_ret;
}

bool pxtnWoice::PTV_Save( const char* path ) const
{
	bool  b_ret = false;
	pxwrDoc doc;
	if( !doc.Open_path( path, "wb" ) )  return false;
	b_ret = PTV_Write( &doc, NULL ) ? true : false;
	return b_ret;
}

