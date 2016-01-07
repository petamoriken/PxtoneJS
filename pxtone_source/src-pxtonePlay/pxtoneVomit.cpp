// '12/03/13

#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include <pxtnService.h>

#include "./pxtoneVomit.h"

pxtoneVomit::pxtoneVomit()
{
	_b_init  = false;
	_b_vomit = false;
	_pxtn    = NULL ;
}

pxtoneVomit::~pxtoneVomit()
{
	_b_init = false;
	if( _pxtn ){ delete (pxtnService*)_pxtn; _pxtn = NULL; }
}


bool pxtoneVomit::Init  ()
{
	bool b_ret = false;

	if( _b_init ) return false;

	pxtnService *pxtn = new pxtnService();

	if( !pxtn->Init( false ) ) goto End;
	pxtn->Quality_Set( 2, 44100, 16 );
	pxtn->vmt_set_loop( true );

	_b_init = true;

	b_ret = true;
End:
	if( b_ret )
	{
		_pxtn = pxtn;
	}
	else
	{
		delete pxtn;
	}
	return b_ret;
}

bool pxtoneVomit::Read  ( pxwrDoc *p_doc )
{
	if( !_b_init ) return false;
	
	int event_num;

	pxtnService *pxtn = (pxtnService*)_pxtn;

	if( !( event_num = pxtn->PreCountEvent( p_doc, MAX_TUNEUNITSTRUCT ) ) ) return false;

	p_doc->Seek( SEEK_SET, 0 );

	pxtn->evels->Release();
	if( !pxtn->evels->Allocate( event_num ) ) return false;
	if( !pxtn->Read( p_doc, true )          ) return false;
	if( !pxtn->Tone_Ready()                 ) return false;
	return true;
}

bool pxtoneVomit::Clear ()
{
	if( !_b_init ) return false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	pxtn->Clear( false );
	return true;
}

bool pxtoneVomit::Start ( int sampling_position, float fade_in_sec )
{
	if( !_b_init ) return false;

	_b_vomit = false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	pxtnVOMITPREPARATION vomit;

	memset( &vomit,0, sizeof(pxtnVOMITPREPARATION) );

	vomit.meas_start   = 0;
	vomit.start_sample = sampling_position;
	vomit.meas_end     = pxtn->master->get_play_meas  ();
	vomit.meas_repeat  = pxtn->master->get_repeat_meas();
	vomit.fadein_msec  = (int)( fade_in_sec * 1000 );

	if( !pxtn->vmt_preparation( &vomit ) ) return false;

	_b_vomit = true;
	return true;
}

bool pxtoneVomit::set_quality ( int ch, int sps, int bps )
{
	if( !_b_init ) return false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	pxtn->Quality_Set( ch, sps, bps );
	return true;
}

bool pxtoneVomit::set_loop    ( bool b_loop         )
{
	if( !_b_init ) return false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	pxtn->vmt_set_loop( b_loop );
	return true;
	
}
bool pxtoneVomit::set_volume  ( float volume        ) // 1.0f = 100%
{
	if( !_b_init ) return false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	pxtn->vmt_set_master_volume( volume );
	return true;
}

int  pxtoneVomit::set_fade    ( int fade, float sec )
{
	if( !_b_init ) return false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	pxtn->vmt_set_fade( fade, (int)( sec * 1000 ) );
	return pxtn->vmt_get_sampling_offset();
}

bool pxtoneVomit::is_vomiting() const
{
	if( !_b_init ) return false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	return _b_vomit;
}

const char *pxtoneVomit::get_title     () const
{
	if( !_b_init ) return NULL;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	return pxtn->text->get_name();
}

const char *pxtoneVomit::get_comment   () const
{
	if( !_b_init ) return NULL;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	return pxtn->text->get_comment();
}

const char *pxtoneVomit::get_last_error() const
{
	if( !_b_init ) return NULL;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	return pxtn->get_last_error_text();
}

bool pxtoneVomit::get_info( int *p_beat_num, float *p_beat_tempo, int *p_beat_clock, int *p_meas_num ) const
{
	if( !_b_init ) return false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	pxtn->master->Get( p_beat_num, p_beat_tempo, p_beat_clock );
	if( p_meas_num ) *p_meas_num = pxtn->master->get_play_meas();
	return true;
}

int  pxtoneVomit::get_meas_repeat() const
{
	if( !_b_init ) return 0;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	return pxtn->master->get_repeat_meas();
}

int  pxtoneVomit::get_meas_play  () const
{
	if( !_b_init ) return 0;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	return pxtn->master->get_play_meas();
}

bool pxtoneVomit::vomit( void *p_buf, int buf_size )
{
	if( !_b_init ) return false;
	pxtnService *pxtn = (pxtnService*)_pxtn;
	_b_vomit = pxtn->Vomit( p_buf, buf_size );
	return _b_vomit;
}

int pxtoneVomit_Calc_sample_num( int meas_num, int beat_num, int sps, float beat_tempo )
{
	return pxtnService_vmt_CalcSampleNum( meas_num, beat_num, sps, beat_tempo );
}
