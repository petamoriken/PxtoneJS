// '12/03/03

#include <stdlib.h>
#include <string.h>

#include "./pxtnOverDrive.h"

pxtnOverDrive::pxtnOverDrive()
{
	_b_played = true;
}

pxtnOverDrive::~pxtnOverDrive()
{
}

float pxtnOverDrive::get_cut  ()const{ return _cut_f; }
float pxtnOverDrive::get_amp  ()const{ return _amp_f; }
int   pxtnOverDrive::get_group()const{ return _group; }

void  pxtnOverDrive::Set( float cut, float amp, int group )
{
	_cut_f = cut  ;
	_amp_f = amp  ;
	_group = group;
}

bool pxtnOverDrive::get_played()const{ return _b_played; }
void pxtnOverDrive::set_played( bool b ){ _b_played = b; }
bool pxtnOverDrive::switch_played(){ _b_played = _b_played ? false : true; return _b_played; }

void pxtnOverDrive::Tone_Ready()
{
	_cut_16bit_top  = (long)( 32767 * ( 100 - _cut_f ) / 100 );
}

void pxtnOverDrive::Tone_Supple( long *group_smps ) const
{
	if( !_b_played ) return;
	long work = group_smps[ _group ];
	if(      work >  _cut_16bit_top ) work = (long)(  _cut_16bit_top );
	else if( work < -_cut_16bit_top ) work = (long)( -_cut_16bit_top );
	group_smps[ _group ] = (long)( (float)work * _amp_f );
}


// (8byte) =================
typedef struct
{
	unsigned short xxx  ;
	unsigned short group;
	float          cut  ;
	float          amp  ;
	float          yyy  ;
}
_OVERDRIVESTRUCT;

bool pxtnOverDrive::Write( pxwrDoc *p_doc ) const
{
	_OVERDRIVESTRUCT over;
	long             size;

	memset( &over, 0, sizeof( _OVERDRIVESTRUCT ) );
	over.cut   = _cut_f;
	over.amp   = _amp_f;
	over.group = (unsigned short)_group;

	// dela ----------
	size = sizeof( _OVERDRIVESTRUCT );
	if( !p_doc->w( &size, sizeof(unsigned long), 1 ) ) return false;
	if( !p_doc->w( &over, size,                  1 ) ) return false;

	return true;
}

// “Ç‚Ýž‚Ý
bool pxtnOverDrive::Read( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	_OVERDRIVESTRUCT over;
	long             size;

	memset( &over, 0, sizeof(_OVERDRIVESTRUCT) );
	if( !p_doc->r( &size, 4,                        1 ) ) return false;
	if( !p_doc->r( &over, sizeof(_OVERDRIVESTRUCT), 1 ) ) return false;

	if( over.xxx                         ) return false;
	if( over.yyy                         ) return false;
	if( over.cut > TUNEOVERDRIVE_CUT_MAX || over.cut < TUNEOVERDRIVE_CUT_MIN ) return false;
	if( over.amp > TUNEOVERDRIVE_AMP_MAX || over.amp < TUNEOVERDRIVE_AMP_MIN ) return false;

	_cut_f = over.cut  ;
	_amp_f = over.amp  ;
	_group = over.group;

	return true;
}