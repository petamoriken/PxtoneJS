// '12/03/29

#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include <pxtnService.h>

#include "./pxtoneNoise.h"

pxtoneNoise::pxtoneNoise()
{
	_bldr = NULL ;
	_sps  = 44100;
	_ch   =     2;
	_bps  =    16;
}

pxtoneNoise::~pxtoneNoise()
{
	if( _bldr ) delete (pxPulse_NoiseBuilder*)_bldr; _bldr = NULL;
}

bool pxtoneNoise::Init()
{
	pxPulse_NoiseBuilder *bldr = new pxPulse_NoiseBuilder();	
	if( !bldr->Init() ){ free( bldr ); return false; }	
	_bldr = bldr;
	return true;
}

bool pxtoneNoise::SetQuality( int ch, int sps, int bps )
{
	switch( ch )
	{
	case 1: case 2: break;
	default: return false;
	}

	switch( sps )
	{
	case 44100: case 22050: case 11025: break;
	default: return false;
	}

	switch( bps )
	{
	case 8: case 16: break;
	default: return false;
	}

	_ch  = ch ;
	_bps = bps;
	_sps = sps;

	return true;
}

bool pxtoneNoise::Sample( pxwrDoc *p_doc, void **pp_buf, int *p_size ) const
{
	bool                 b_ret  = false;
	pxPulse_NoiseBuilder *bldr  = (pxPulse_NoiseBuilder*)_bldr;
	pxPulse_Noise        *noise = new pxPulse_Noise();
	pxPulse_PCM          *pcm   = NULL;

	if( !noise->Read( p_doc, NULL )                           ) goto End;
	if( !( pcm = bldr->BuildNoise( noise, _ch, _sps, _bps ) ) ) goto End;

	*p_size = pcm->get_buf_size();
	*pp_buf = pcm->Devolve_SamplingBuffer();

	b_ret = true;
End:
	if( noise ) delete noise;
	if( pcm   ) delete pcm  ;

	return b_ret;
}
