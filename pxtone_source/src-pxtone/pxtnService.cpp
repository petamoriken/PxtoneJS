//
// x1x : v.0.1.2.8 (-2005/06/03) project-info has quality, tempo, clock.
// x2x : v.0.6.N.N (-2006/01/15) no exe version.
// x3x : v.0.7.N.N (-2006/09/30) unit includes voice / basic-key use for only view
//                               no-support event: voice_no, group_no, correct.
// x4x : v.0.8.3.4 (-2007/10/20) unit has event-list.

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <pxwrDoc.h>

#include "./pxtnService.h"


#define _VERSIONSIZE    16
#define _CODESIZE        8

//                                       0123456789012345
static const char* _code_tune_x2x     = "PTTUNE--20050608";
static const char* _code_tune_x3x     = "PTTUNE--20060115";
static const char* _code_tune_x4x     = "PTTUNE--20060930";
static const char* _code_tune_v5      = "PTTUNE--20071119";
							
static const char* _code_proj_x1x     = "PTCOLLAGE-050227";
static const char* _code_proj_x2x     = "PTCOLLAGE-050608";
static const char* _code_proj_x3x     = "PTCOLLAGE-060115";
static const char* _code_proj_x4x     = "PTCOLLAGE-060930";
static const char* _code_proj_v5      = "PTCOLLAGE-071119";
							
							
static const char* _code_x1x_PROJ     = "PROJECT=";
static const char* _code_x1x_EVEN     = "EVENT===";
static const char* _code_x1x_UNIT     = "UNIT====";
static const char* _code_x1x_END      = "END=====";
static const char* _code_x1x_PCM      = "matePCM=";
			
static const char* _code_x3x_pxtnUNIT = "pxtnUNIT";
static const char* _code_x4x_evenMAST = "evenMAST";
static const char* _code_x4x_evenUNIT = "evenUNIT";
			
static const char* _code_antiOPER     = "antiOPER"; // anti operation(edit)
			
static const char* _code_num_UNIT     = "num UNIT";
static const char* _code_MasterV5     = "MasterV5";
static const char* _code_Event_V5     = "Event V5";
static const char* _code_matePCM      = "matePCM ";
static const char* _code_matePTV      = "matePTV ";
static const char* _code_matePTN      = "matePTN ";
static const char* _code_mateOGGV     = "mateOGGV";
static const char* _code_effeDELA     = "effeDELA";
//static const char* _code_effeSTRA     = "effeSTRA";
static const char* _code_effeOVER     = "effeOVER";
static const char* _code_textNAME     = "textNAME";
static const char* _code_textCOMM     = "textCOMM";
static const char* _code_assiUNIT     = "assiUNIT";
static const char* _code_assiWOIC     = "assiWOIC";
static const char* _code_pxtoneND     = "pxtoneND";

enum _enum_Tag
{
	_TAG_Unknown  = 0,
	_TAG_antiOPER    ,

	_TAG_x1x_PROJ    ,
	_TAG_x1x_UNIT    ,
	_TAG_x1x_PCM     ,
	_TAG_x1x_EVEN    ,
	_TAG_x1x_END     ,
	_TAG_x3x_pxtnUNIT,
	_TAG_x4x_evenMAST,
	_TAG_x4x_evenUNIT,

	_TAG_num_UNIT    ,
	_TAG_MasterV5    ,
	_TAG_Event_V5    ,
	_TAG_matePCM     ,
	_TAG_matePTV     ,
	_TAG_matePTN     ,
	_TAG_mateOGGV    ,
	_TAG_effeDELA    ,
	_TAG_effeOVER    ,
//	_TAG_effeSTRA    ,
	_TAG_textNAME    ,
	_TAG_textCOMM    ,
	_TAG_assiUNIT    ,
	_TAG_assiWOIC    ,
	_TAG_pxtoneND    

};
/*
static char _error_text[ _ERRORTEXT_SIZE ] = { NULL };


#include <stdarg.h>


static void _SetErrorText( const char *fmt, ... )
{
	va_list ap;
	char str[ _ERRORTEXT_SIZE*2 ];
	memset( str, 0, _ERRORTEXT_SIZE*2 );
	va_start( ap, fmt ); vsprintf( str, fmt, ap); va_end( ap );

	memset( _error_text, 0,   _ERRORTEXT_SIZE     );
	memcpy( _error_text, str, _ERRORTEXT_SIZE - 1 );
}
*/

pxtnService::pxtnService()
{
	_err    = pxtnERR_None;

	text    = NULL;
	master  = NULL;
	evels   = NULL;

	_delays = NULL; _delay_max = _delay_num = 0;
	_ovdrvs = NULL; _ovdrv_max = _ovdrv_num = 0;
	_woices = NULL; _woice_max = _woice_num = 0;
	_units  = NULL; _unit_max  = _unit_num  = 0;

	_ptn_bldr = NULL;

	_vmt_constructor();
}

pxtnService::~pxtnService()
{
	_vmt_destructer();

	SAFE_DELETE( text      );
	SAFE_DELETE( master    );
	SAFE_DELETE( evels     );
	SAFE_DELETE( _ptn_bldr );
	if( _delays ){ for( int i = 0; i < _delay_num; i++ ) SAFE_DELETE( _delays[ i ] ); free( _delays ); }
	if( _ovdrvs ){ for( int i = 0; i < _ovdrv_num; i++ ) SAFE_DELETE( _ovdrvs[ i ] ); free( _ovdrvs ); }
	if( _woices ){ for( int i = 0; i < _woice_num; i++ ) SAFE_DELETE( _woices[ i ] ); free( _woices ); }
	if( _units  ){ for( int i = 0; i < _unit_num ; i++ ) SAFE_DELETE( _units [ i ] ); free( _units  ); }
}

bool pxtnService::Init( bool b_reserve_evels )
{
	bool b_ret = false;

	text      = new pxtnText  ();
	master    = new pxtnMaster();
	evels     = new pxtnEvelist();
	_ptn_bldr = new pxPulse_NoiseBuilder();

	if( !_ptn_bldr->Init() ){ _err = pxtnERR_NoiseBuilder_Init; goto End; }

	if( b_reserve_evels && !evels->Allocate( MAX_EVENTNUM ) ){ _err = pxtnERR_EventList_Allocate; goto End; }

	// delay
	if( !(  _delays = (pxtnDelay**)malloc( sizeof(pxtnDelay*) * MAX_TUNEDELAYSTRUCT ) ) ){ _err = pxtnERR_Allocate; goto End; }
	memset( _delays, 0,                    sizeof(pxtnDelay*) * MAX_TUNEDELAYSTRUCT );
	_delay_max = MAX_TUNEDELAYSTRUCT;

	// over-drive
	if( !(  _ovdrvs = (pxtnOverDrive**)malloc( sizeof(pxtnOverDrive*) * MAX_TUNEOVERDRIVESTRUCT ) ) ){ _err = pxtnERR_Allocate; goto End; }
	memset( _ovdrvs, 0,                        sizeof(pxtnOverDrive*) * MAX_TUNEOVERDRIVESTRUCT );
	_ovdrv_max = MAX_TUNEOVERDRIVESTRUCT;

	// woice
	if( !(  _woices = (pxtnWoice**)malloc( sizeof(pxtnWoice*) * MAX_TUNEWOICESTRUCT ) ) ){ _err = pxtnERR_Allocate; goto End; }
	memset( _woices, 0,                    sizeof(pxtnWoice*) * MAX_TUNEWOICESTRUCT );
	_woice_max = MAX_TUNEWOICESTRUCT;

	// unit
	if( !(  _units = (pxtnUnit**)malloc( sizeof(pxtnUnit*) * MAX_TUNEUNITSTRUCT ) ) ){ _err = pxtnERR_Allocate; goto End; }
	memset( _units, 0,                   sizeof(pxtnUnit*) * MAX_TUNEUNITSTRUCT );
	_unit_max = MAX_TUNEUNITSTRUCT;

	_group_num = MAX_TUNEGROUPNUM  ;

	if( !_vmt_init() ){ _err = pxtnERR_Allocate; goto End; }

	b_ret = true;
End:

	return true;
}

/*
const char *pxtnService::GetIOError()
{
	return _error_text;
}
*/

void pxtnService::AdjustMeasNum()
{
	master->AdjustMeasNum( evels->get_Max_Clock() );
}

int  pxtnService::Group_Num() const{ return _group_num; }

bool pxtnService::Tone_Ready()
{
	int   beat_num   = master->get_beat_num  ();
	float beat_tempo = master->get_beat_tempo();

	for( int i = 0; i < _delay_num; i++ ){ if( !_delays[ i ]->Tone_Ready( beat_num, beat_tempo, _sps, _bps ) ) return false; }
	for( int i = 0; i < _ovdrv_num; i++ ){      _ovdrvs[ i ]->Tone_Ready(); }
	for( int i = 0; i < _woice_num; i++ ){ if( !_woices[ i ]->Tone_Ready( _ptn_bldr, _sps ) ) return false; }
	return true;
}

void pxtnService::Tone_Clear()
{
	for( int i = 0; i < _delay_num; i++ ) _delays[ i ]->Tone_Clear();
	for( int i = 0; i < _unit_num;  i++ ) _units [ i ]->Tone_Clear();
}

// ---------------------------
// Delay..
// ---------------------------

int  pxtnService::Delay_Num() const{ return _delay_num; }
int  pxtnService::Delay_Max() const{ return _delay_max; }

bool pxtnService::Delay_Set( int idx, DELAYUNIT unit, float freq, float rate, int group )
{
	if( idx >= _delay_num ) return false;
	_delays[ idx ]->Set( unit, freq, rate, group );
	return true;
}

bool pxtnService::Delay_Add( DELAYUNIT unit, float freq, float rate, int group )
{
	if( _delay_num >= _delay_max ) return false;
	_delays[ _delay_num ] = new pxtnDelay();
	_delays[ _delay_num ]->Set( unit, freq, rate, group );
	_delay_num++;
	return true;
}

bool pxtnService::Delay_Remove( int idx )
{
	if( idx >= _delay_num ) return false;

	SAFE_DELETE( _delays[ idx ] );
	_delay_num--;
	for( int i = idx; i < _delay_num; i++ ) _delays[ i ] = _delays[ i + 1 ];
	_delays[ _delay_num ] = NULL;
	return true;
}

pxtnDelay *pxtnService::Delay_Get( int idx )
{
	if( idx < 0 || idx >= _delay_num ) return NULL;
	return _delays[ idx ];
}

bool pxtnService::Delay_ReadyTone( int idx )
{
	if( idx < 0 || idx >= _delay_num ) return NULL;
	return _delays[ idx ]->Tone_Ready( master->get_beat_num(), master->get_beat_tempo(), _sps, _bps );
}


// ---------------------------
// Over Drive..
// ---------------------------

int  pxtnService::OverDrive_Num() const{ return _ovdrv_num; }
int  pxtnService::OverDrive_Max() const{ return _ovdrv_max; }

bool pxtnService::OverDrive_Set( int idx, float cut, float amp, int group )
{
	if( idx >= _ovdrv_num ) return false;
	_ovdrvs[ idx ]->Set( cut, amp, group );
	return true;
}

bool pxtnService::OverDrive_Add( float cut, float amp, int group )
{
	if( _ovdrv_num >= _ovdrv_max ) return false;
	_ovdrvs[ _ovdrv_num ] = new pxtnOverDrive();
	_ovdrvs[ _ovdrv_num ]->Set( cut, amp, group );
	_ovdrv_num++;
	return true;
}

bool pxtnService::OverDrive_Remove( int idx )
{
	if( idx >= _ovdrv_num ) return false;

	SAFE_DELETE( _ovdrvs[ idx ] );
	_ovdrv_num--;
	for( int i = idx; i < _ovdrv_num; i++ ) _ovdrvs[ i ] = _ovdrvs[ i + 1 ];
	_ovdrvs[ _ovdrv_num ] = NULL;
	return true;
}

pxtnOverDrive *pxtnService::OverDrive_Get( int idx )
{
	if( idx < 0 || idx >= _ovdrv_num ) return NULL;
	return _ovdrvs[ idx ];
}

void pxtnService::OverDrive_ReadyTone( int idx )
{
	if( idx < 0 || idx >= _ovdrv_num ) return;
	_ovdrvs[ idx ]->Tone_Ready();
}

// ---------------------------
// Woice..
// ---------------------------

int  pxtnService::Woice_Num() const{ return _woice_num; }
int  pxtnService::Woice_Max() const{ return _woice_max; }

const pxtnWoice *pxtnService::Woice_Get( int idx ) const
{
	if( idx < 0 || idx >= _woice_num ) return NULL;
	return _woices[ idx ];
}
pxtnWoice       *pxtnService::Woice_Get_variable( int idx )
{
	if( idx < 0 || idx >= _woice_num ) return NULL;
	return _woices[ idx ];
}


bool pxtnService::Woice_Load( int idx, const char *path, pxtnWOICETYPE type, bool *pb_new_fmt )
{
	if( idx < 0 || idx >= _woice_max ) return false;
	if( idx > _woice_num ) return false;
	if( idx == _woice_num ){ _woices[ idx ] = new pxtnWoice(); _woice_num++; }
	if( !_woices[ idx ]->Load( path, type, pb_new_fmt ) ){ Woice_Remove( idx ); return false; }
	return true;
}

bool pxtnService::Woice_ReadyTone( int idx )
{
	if( idx < 0 || idx >= _woice_num ) return false;
	return _woices[ idx ]->Tone_Ready( _ptn_bldr, _sps );
}

void pxtnService::Woice_Remove( int idx )
{
	if( idx < 0 || idx >= _woice_num ) return;
	SAFE_DELETE( _woices[ idx ] );
	_woice_num--;
	for( int i = idx; i < _woice_num; i++ ) _woices[ i ] = _woices[ i + 1 ];
	_woices[ _woice_num ] = NULL;
}

void pxtnService::Woice_Replace( int old_place, int new_place )
{
	pxtnWoice        *p_w;
	int             max_place;

	p_w       = _woices[ old_place ];
	max_place = _woice_num - 1;
	if( new_place >  max_place ) new_place = max_place;
	if( new_place == old_place ) return;

	if( old_place < new_place )
	{
		for( int w = old_place; w < new_place; w++ ){ if( _woices[ w ] ) _woices[ w ] = _woices[ w + 1 ]; }
	}
	else
	{
		for( int w = old_place; w > new_place; w-- ){ if( _woices[ w ] ) _woices[ w ] = _woices[ w - 1 ]; }
	}

	_woices[ new_place ] = p_w;
}
// ---------------------------
// Unit..
// ---------------------------

int  pxtnService::Unit_Num() const{ return _unit_num; }
int  pxtnService::Unit_Max() const{ return _unit_max; }

const pxtnUnit *pxtnService::Unit_Get( int idx ) const
{
	if( idx < 0 || idx >= _unit_num ) return NULL;
	return _units[ idx ];
}
pxtnUnit       *pxtnService::Unit_Get_variable( int idx )
{
	if( idx < 0 || idx >= _unit_num ) return NULL;
	return _units[ idx ];
}

bool pxtnService::Unit_AddNew()
{
	if( _unit_num >= _unit_max ) return false;
	_units[ _unit_num ] = new pxtnUnit();
	_unit_num++;
	return true;
}

void pxtnService::Unit_Remove( int idx )
{
	if( idx < 0 || idx >= _unit_num ) return;
	SAFE_DELETE( _units[ idx ] );
	_unit_num--;
	for( int i = idx; i < _unit_num; i++ ) _units[ i ] = _units[ i + 1 ];
	_units[ _unit_num ] = NULL;
}

void pxtnService::Unit_Replace( int old_place, int new_place )
{
	pxtnUnit        *p_w;
	int             max_place;

	p_w       = _units[ old_place ];
	max_place = _unit_num - 1;
	if( new_place >  max_place ) new_place = max_place;
	if( new_place == old_place ) return;

	if( old_place < new_place )
	{
		for( int w = old_place; w < new_place; w++ ){ if( _units[ w ] ) _units[ w ] = _units[ w + 1 ]; }
	}
	else
	{
		for( int w = old_place; w > new_place; w-- ){ if( _units[ w ] ) _units[ w ] = _units[ w - 1 ]; }
	}

	_units[ new_place ] = p_w;
}

void pxtnService::Unit_SetOpratedAll( bool b )
{
	for( int u = 0; u < _unit_num; u++ )
	{
		_units[ u ]->set_operated( b );
		if( b ) _units[ u ]->set_played( true );
	}
}

void pxtnService::Unit_Solo( int idx )
{
	for( int u = 0; u < _unit_num; u++ )
	{
		if( u == idx ) _units[ u ]->set_played( true  );
		else           _units[ u ]->set_played( false );
	}
}


// ---------------------------
// Quality..
// ---------------------------

void pxtnService::Quality_Set( int ch, int sps, int bps )
{
	_ch  = ch ;
	_sps = sps;
	_bps = bps;
}

void pxtnService::Quality_Get( int *p_ch, int *p_sps, int *p_bps ) const
{
	if( p_ch  ) *p_ch  = _ch ;
	if( p_sps ) *p_sps = _sps;
	if( p_bps ) *p_bps = _bps;
}


static _enum_Tag _CheckTagCode( const char *p_code )
{
	if(      !memcmp( p_code, _code_antiOPER    , _CODESIZE ) ) return _TAG_antiOPER;
	else if( !memcmp( p_code, _code_x1x_PROJ    , _CODESIZE ) ) return _TAG_x1x_PROJ;
	else if( !memcmp( p_code, _code_x1x_UNIT    , _CODESIZE ) ) return _TAG_x1x_UNIT;
	else if( !memcmp( p_code, _code_x1x_PCM     , _CODESIZE ) ) return _TAG_x1x_PCM;
	else if( !memcmp( p_code, _code_x1x_EVEN    , _CODESIZE ) ) return _TAG_x1x_EVEN;
	else if( !memcmp( p_code, _code_x1x_END     , _CODESIZE ) ) return _TAG_x1x_END;
	else if( !memcmp( p_code, _code_x3x_pxtnUNIT, _CODESIZE ) ) return _TAG_x3x_pxtnUNIT;
	else if( !memcmp( p_code, _code_x4x_evenMAST, _CODESIZE ) ) return _TAG_x4x_evenMAST;
	else if( !memcmp( p_code, _code_x4x_evenUNIT, _CODESIZE ) ) return _TAG_x4x_evenUNIT;
	else if( !memcmp( p_code, _code_num_UNIT    , _CODESIZE ) ) return _TAG_num_UNIT;
	else if( !memcmp( p_code, _code_Event_V5    , _CODESIZE ) ) return _TAG_Event_V5;
	else if( !memcmp( p_code, _code_MasterV5    , _CODESIZE ) ) return _TAG_MasterV5;
	else if( !memcmp( p_code, _code_matePCM     , _CODESIZE ) ) return _TAG_matePCM ;
	else if( !memcmp( p_code, _code_matePTV     , _CODESIZE ) ) return _TAG_matePTV ;
	else if( !memcmp( p_code, _code_matePTN     , _CODESIZE ) ) return _TAG_matePTN ;
	else if( !memcmp( p_code, _code_mateOGGV    , _CODESIZE ) ) return _TAG_mateOGGV;
	else if( !memcmp( p_code, _code_effeDELA    , _CODESIZE ) ) return _TAG_effeDELA;
//	else if( !memcmp( p_code, _code_effeSTRA    , _CODESIZE ) ) return _TAG_effeSTRA;
	else if( !memcmp( p_code, _code_effeOVER    , _CODESIZE ) ) return _TAG_effeOVER;
	else if( !memcmp( p_code, _code_textNAME    , _CODESIZE ) ) return _TAG_textNAME;
	else if( !memcmp( p_code, _code_textCOMM    , _CODESIZE ) ) return _TAG_textCOMM;
	else if( !memcmp( p_code, _code_assiUNIT    , _CODESIZE ) ) return _TAG_assiUNIT;
	else if( !memcmp( p_code, _code_assiWOIC    , _CODESIZE ) ) return _TAG_assiWOIC;
	else if( !memcmp( p_code, _code_pxtoneND    , _CODESIZE ) ) return _TAG_pxtoneND;
	return _TAG_Unknown;
}

void pxtnService::Clear( bool b_release_evels )
{
	text->set_name   ( "" );
	text->set_comment( "" );
	evels->Clear     (    );

	for( int i = 0; i < _delay_num; i++ ) SAFE_DELETE( _delays[ i ] ); _delay_num = 0;
	for( int i = 0; i < _delay_num; i++ ) SAFE_DELETE( _ovdrvs[ i ] ); _ovdrv_num = 0;
	for( int i = 0; i < _woice_num; i++ ) SAFE_DELETE( _woices[ i ] ); _woice_num = 0;
	for( int i = 0; i < _unit_num ; i++ ) SAFE_DELETE( _units [ i ] ); _unit_num  = 0;

	master->Reset();

	if( b_release_evels ) evels->Release();
	else                  evels->Clear  ();
}





bool pxtnService::_io_Read_Delay( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	if( !_delays ) return false;
	if( _delay_num >= _delay_max ){ *pb_new_fmt = true; return false; }

	bool      b_ret  = false;
	pxtnDelay *delay = new pxtnDelay();
	if( !delay->Read( p_doc, pb_new_fmt ) ) goto End;

	b_ret = true;
End:
	if( b_ret ){ _delays[ _delay_num ] = delay; _delay_num++; }
	else       { SAFE_DELETE( delay ); }
	return b_ret;
}

bool pxtnService::_io_Read_OverDrive( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	if( !_ovdrvs ) return false;
	if( _ovdrv_num >= _ovdrv_max ){ *pb_new_fmt = true; return false; }

	bool      b_ret  = false;
	pxtnOverDrive *ovdrv = new pxtnOverDrive();
	if( !ovdrv->Read( p_doc, pb_new_fmt ) ) goto End;

	b_ret = true;
End:
	if( b_ret ){ _ovdrvs[ _ovdrv_num ] = ovdrv; _ovdrv_num++; }
	else       { SAFE_DELETE( ovdrv ); }
	return b_ret;
}

bool pxtnService::_io_Read_Woice( pxwrDoc *p_doc, bool *pb_new_fmt, pxtnWOICETYPE type )
{
	if( !_woices ) return false;
	if( _woice_num >= _woice_max ){ *pb_new_fmt = true; return false; }

	bool      b_ret  = false;
	pxtnWoice *woice = new pxtnWoice();
	switch( type )
	{
	case pxtnWOICE_PCM : if( !woice->io_matePCM_r ( p_doc, pb_new_fmt ) ) goto End; break;
	case pxtnWOICE_PTV : if( !woice->io_matePTV_r ( p_doc, pb_new_fmt ) ) goto End; break;
	case pxtnWOICE_PTN : if( !woice->io_matePTN_r ( p_doc, pb_new_fmt ) ) goto End; break;
	case pxtnWOICE_OGGV: if( !woice->io_mateOGGV_r( p_doc, pb_new_fmt ) ) goto End; break;
	default: goto End;
	}

	b_ret = true;
End:
	if( b_ret ){ _woices[ _woice_num ] = woice; _woice_num++; }
	else       { SAFE_DELETE( woice ); }
	return b_ret;
}

bool pxtnService::_io_Read_OldUnit( pxwrDoc *p_doc, bool *pb_new_fmt, int ver        )
{
	if( !_units ) return false;
	if( _unit_num >= _unit_max ){ *pb_new_fmt = true; return false; }

	bool      b_ret = false;
	pxtnUnit *unit  = new pxtnUnit();
	int       group = 0;

	switch( ver )
	{
	case 1: if( !unit->Read_v1x( p_doc, &group             ) ) goto End; break;
	case 3: if( !unit->Read_v3x( p_doc, pb_new_fmt, &group ) ) goto End; break;
	default: goto End;
	}

	if( group >= _group_num ) group = _group_num - 1;

	evels->x4x_Read_Add( 0, (unsigned char)_unit_num, EVENTKIND_GROUPNO, (long)group     );
	evels->x4x_Read_NewKind();
	evels->x4x_Read_Add( 0, (unsigned char)_unit_num, EVENTKIND_VOICENO, (long)_unit_num );
	evels->x4x_Read_NewKind();

	b_ret = true;
End:
	if( b_ret ){ _units[ _unit_num ] = unit; _unit_num++; }
	else       { SAFE_DELETE( unit ); }
	return b_ret;
}

/////////////
// assi woice
/////////////

typedef struct
{
	unsigned short woice_index;
	unsigned short rrr;
	char           name[ MAX_TUNEWOICENAME ];
}
_ASSIST_WOICE;

bool pxtnService::_io_assiWOIC_w( pxwrDoc *p_doc, int idx ) const
{
	_ASSIST_WOICE assi;
	long    size;

	memset( &assi, 0, sizeof( _ASSIST_WOICE ) );
	memcpy( assi.name, _woices[ idx ]->get_name(), MAX_TUNEWOICENAME );
	assi.woice_index = (unsigned short)idx;
	assi.rrr         = 0;

	size = sizeof( _ASSIST_WOICE );
	if( !p_doc->w( &size, sizeof(unsigned long), 1 ) ) return false;
	if( !p_doc->w( &assi, size,                  1 ) ) return false;

	return true;
}

bool pxtnService::_io_assiWOIC_r( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	_ASSIST_WOICE assi;
	long          size;

	if( !p_doc->r( &size, 4,                 1 )   ) return false;
	if( size != sizeof( _ASSIST_WOICE ) ){ *pb_new_fmt = true; return false; }
	if( !p_doc->r( &assi, sizeof( _ASSIST_WOICE ), 1 )   ) return false;
	if( assi.rrr ){ *pb_new_fmt = true; return false; }

	if( assi.woice_index >= _woice_num ) return false;

	char name[ MAX_TUNEWOICENAME + 1 ];
	memcpy( name, assi.name, MAX_TUNEWOICENAME );
	name[ MAX_TUNEWOICENAME ] = '\0';

	_woices[ assi.woice_index ]->set_name( name );
	return true;
}


// -----
// assi unit.
// -----

typedef struct
{
	unsigned short unit_index;
	unsigned short rrr;
	char           name[ MAX_TUNEUNITNAME ];
}
_ASSIST_UNIT;

bool pxtnService::_io_assiUNIT_w( pxwrDoc *p_doc, int idx ) const
{
	_ASSIST_UNIT assi;
	long         size;

	memset( &assi, 0, sizeof( _ASSIST_UNIT ) );
	memcpy( assi.name, _units[ idx ]->get_name(), MAX_TUNEUNITNAME );
	assi.unit_index = (unsigned short)idx;
	assi.rrr        = 0;

	size = sizeof( _ASSIST_UNIT );
	if( !p_doc->w( &size, sizeof(unsigned long), 1 ) ) return false;
	if( !p_doc->w( &assi, size,                  1 ) ) return false;

	return true;
}

bool pxtnService::_io_assiUNIT_r( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	_ASSIST_UNIT assi;
	long         size;

	if( !p_doc->r( &size, 4,                 1 ) ) return false;
	if( size != sizeof( _ASSIST_UNIT ) )
	{
		*pb_new_fmt = true;
		return false;
	}
	if( !p_doc->r( &assi, sizeof( _ASSIST_UNIT ), 1 ) ) return false;
	if( assi.rrr ){ *pb_new_fmt = true; return false; }

	if( assi.unit_index >= _unit_num ) return false;

	char name[ MAX_TUNEUNITNAME + 1 ];
	memcpy( name, assi.name, MAX_TUNEUNITNAME );
	name[ MAX_TUNEUNITNAME ] = '\0';

	_units[ assi.unit_index ]->set_name( name );

	return true;
}

// -----
// unit num
// -----
typedef struct
{
	unsigned short num;
	unsigned short rrr;
}
_NUM_UNIT;

bool pxtnService::_io_UNIT_num_w( pxwrDoc *p_doc ) const
{
	_NUM_UNIT data;
	long      size;

	memset( &data, 0, sizeof( _NUM_UNIT ) );

	data.num = (short)_unit_num;

	size = sizeof(_NUM_UNIT);
	if( !p_doc->w( &size, sizeof(long), 1 ) ) return false;
	if( !p_doc->w( &data, size        , 1 ) ) return false;

	return true;
}

int pxtnService::_io_UNIT_num_r( pxwrDoc *p_doc, bool *pb_new_fmt )
{
	_NUM_UNIT data;
	long      size;

	if( !p_doc->r( &size, 4,                   1 ) ) return -1;
	if( size != sizeof( _NUM_UNIT ) ){ *pb_new_fmt = true; return -1; }
	if( !p_doc->r( &data, sizeof( _NUM_UNIT ), 1 ) ) return -1;
	if( data.rrr             ){ *pb_new_fmt = true; return -1; }
//	if( data.num < 0 ) return -1;
	if( data.num > _unit_max ){ *pb_new_fmt = true; return -1; } 

	return data.num;
}




////////////////////////////////////////
// save               //////////////////
////////////////////////////////////////

bool pxtnService::Save( pxwrDoc *p_doc, bool b_tune, unsigned short exe_ver )
{
//	pxwrDoc          doc;
//	int              unit_num;
	bool             b_ret = false;
	long             rough;
	unsigned short   rrr   = 0;

	if( b_tune ) rough = 10;
	else         rough =  1;
	

//	if( !doc.Open_path( path, "wb" ) ) { _err _SetErrorText( "open file" ); goto End; }

	// format version
	if( b_tune ){ if( !p_doc->w( _code_tune_v5, 1, _VERSIONSIZE ) ){ _err = pxtnERR_io_w_Version; goto End; } }
	else        { if( !p_doc->w( _code_proj_v5, 1, _VERSIONSIZE ) ){ _err = pxtnERR_io_w_Version; goto End; } }

	// exe version
	if( !p_doc->w( &exe_ver, sizeof(unsigned short), 1 ) ){ _err = pxtnERR_io_w_ExeVersion; goto End; }
	if( !p_doc->w( &rrr    , sizeof(unsigned short), 1 ) ){ _err = pxtnERR_io_w_Dummy; goto End; }

	// master
	if( !p_doc->w( _code_MasterV5    , 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
	if( !master->io_w_v5(   p_doc, rough  )           ){ _err = pxtnERR_io_w_Master; goto End; }

	// event
	if( !p_doc->w( _code_Event_V5,     1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
	if( !evels->io_Write(   p_doc, rough  )           ){ _err = pxtnERR_io_w_Events; goto End; }

	// name
	if( text->get_name() )
	{
		if( !p_doc->w( _code_textNAME, 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
		if( !text->Name_w( p_doc  )                   ){ _err = pxtnERR_io_w_Name   ; goto End; }
	}

	// comment
	if( text->get_comment() )
	{
		if( !p_doc->w( _code_textCOMM, 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
		if( !text->Comment_w( p_doc               ) ){ _err = pxtnERR_io_w_Comment; goto End; }
	}

	// delay
	for( int d = 0; d < _delay_num; d++ )
	{
		if( !p_doc->w( _code_effeDELA, 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
		if( !_delays[ d ]->Write( p_doc )             ){ _err = pxtnERR_io_w_Delay  ; goto End; }
	}

	// overdrive
	for( int o = 0; o < _ovdrv_num; o++ )
	{
		if( !p_doc->w( _code_effeOVER, 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode  ; goto End; }
		if( !_ovdrvs[ o ]->Write( p_doc )             ){ _err = pxtnERR_io_w_OverDrive; goto End; }
	}

	// woice
	for( int w = 0; w < _woice_num; w++ )
	{
		pxtnWoice * p_w = _woices[ w ];

		switch( p_w->get_type() )
		{
		case pxtnWOICE_PCM:
			if( !p_doc->w( _code_matePCM , 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
			if( !p_w->io_matePCM_w ( p_doc )              ){ _err = pxtnERR_io_w_PCM    ; goto End; }
			break;										   
		case pxtnWOICE_PTV:								   
			if( !p_doc->w( _code_matePTV , 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
			if( !p_w->io_matePTV_w ( p_doc              ) ){ _err = pxtnERR_io_w_PTV    ; goto End; }
			break;										   
		case pxtnWOICE_PTN:								   
			if( !p_doc->w( _code_matePTN , 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
			if( !p_w->io_matePTN_w ( p_doc              ) ){ _err = pxtnERR_io_w_PTN    ; goto End; }
			break;										   
		case pxtnWOICE_OGGV:							   
			if( !p_doc->w( _code_mateOGGV, 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
			if( !p_w->io_mateOGGV_w( p_doc              ) ){ _err = pxtnERR_io_w_OGGV   ; goto End; }
			break;										   
		}												   
														   
		if( !b_tune && strlen( p_w->get_name() ) )
		{
			if( !p_doc->w( _code_assiWOIC, 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode    ; goto End; }
			if( !_io_assiWOIC_w( p_doc, w )               ){ _err = pxtnERR_io_w_WoiceAssist; goto End; }
		}
	}

	// unit
	if( !p_doc->w( _code_num_UNIT, 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
	if( !_io_UNIT_num_w( p_doc )                  ){ _err = pxtnERR_io_w_UnitNum; goto End; }

	for( int u = 0; u < _unit_num; u++ )
	{
		if( !b_tune && strlen( _units[ u ]->get_name() ) )
		{
			if( !p_doc->w( _code_assiUNIT, 1, _CODESIZE) ){ _err = pxtnERR_io_w_TagCode   ; goto End; }
			if( !_io_assiUNIT_w( p_doc, u )              ){ _err = pxtnERR_io_w_UnitAssist; goto End; }
		}
	}

	{
		int end_size = 0;
		if( !p_doc->w( _code_pxtoneND, 1, _CODESIZE ) ){ _err = pxtnERR_io_w_TagCode; goto End; }
		if( !p_doc->w( &end_size     , 4,         1 ) ){ _err = pxtnERR_io_w_EndSize; goto End; }
	}
	
	b_ret = true;
End:

	return b_ret;
}

////////////////////////////////////////
// Read Project //////////////
////////////////////////////////////////



bool pxtnService::_ReadTuneItems( pxwrDoc *p_doc )
{
	bool b_ret     = false;
	bool b_new_fmt = false;
	bool b_end     = false;
	char code[ _CODESIZE + 1 ] = {'\0'};

	/// must the unit before the voice.
	while( !b_end )
	{
		if( !p_doc->r( code, 1, _CODESIZE ) ){ _err = pxtnERR_io_r_TagCode; goto End; }
		
		_enum_Tag tag = _CheckTagCode( code );
		switch( tag )
		{
		case _TAG_antiOPER    : _err = pxtnERR_io_r_AntiEdit; goto End;

		// new -------
		case _TAG_num_UNIT    :
			{
				int num = _io_UNIT_num_r( p_doc, &b_new_fmt );
				if( num < 0 ){ _err = pxtnERR_io_r_UnitNum; goto End; }
				for( int i = 0; i < num; i++ ){ _units[ i ] = new pxtnUnit(); }
				_unit_num = num;
				break;
			}
		case _TAG_MasterV5    : if( !master->io_r_v5   ( p_doc, &b_new_fmt                 ) ){ _err = pxtnERR_io_r_Master     ; goto End; } break;
		case _TAG_Event_V5    : if( !evels->io_Read    ( p_doc, &b_new_fmt                 ) ){ _err = pxtnERR_io_r_Events     ; goto End; } break;
		case _TAG_matePCM     : if( !_io_Read_Woice    ( p_doc, &b_new_fmt, pxtnWOICE_PCM  ) ){ _err = pxtnERR_io_r_PCM        ; goto End; } break;
		case _TAG_matePTV     : if( !_io_Read_Woice    ( p_doc, &b_new_fmt, pxtnWOICE_PTV  ) ){ _err = pxtnERR_io_r_PTV        ; goto End; } break;
		case _TAG_matePTN     : if( !_io_Read_Woice    ( p_doc, &b_new_fmt, pxtnWOICE_PTN  ) ){ _err = pxtnERR_io_r_PTN        ; goto End; } break;
		case _TAG_mateOGGV    : if( !_io_Read_Woice    ( p_doc, &b_new_fmt, pxtnWOICE_OGGV ) ){ _err = pxtnERR_io_r_OGGV       ; goto End; } break;
		case _TAG_effeDELA    : if( !_io_Read_Delay    ( p_doc, &b_new_fmt                 ) ){ _err = pxtnERR_io_r_Delay      ; goto End; } break;
		case _TAG_effeOVER    : if( !_io_Read_OverDrive( p_doc, &b_new_fmt                 ) ){ _err = pxtnERR_io_r_OverDrive  ; goto End; } break;
		case _TAG_textNAME    : if( !text->Name_r      ( p_doc                             ) ){ _err = pxtnERR_io_r_Title      ; goto End; } break;
		case _TAG_textCOMM    : if( !text->Comment_r   ( p_doc                             ) ){ _err = pxtnERR_io_r_Coment     ; goto End; } break;
		case _TAG_assiWOIC    : if( !_io_assiWOIC_r    ( p_doc, &b_new_fmt                 ) ){ _err = pxtnERR_io_r_WoiceAssist; goto End; } break;
		case _TAG_assiUNIT    : if( !_io_assiUNIT_r    ( p_doc, &b_new_fmt                 ) ){ _err = pxtnERR_io_r_UnitAssist ; goto End; } break;
		case _TAG_pxtoneND    : b_end = true; break;				

		// old -------
		case _TAG_x4x_evenMAST: if( !master->io_r_x4x              ( p_doc, &b_new_fmt                ) ){ _err = pxtnERR_io_r_v4_Master ; goto End; } break;
		case _TAG_x4x_evenUNIT: if( !evels ->io_Unit_Read_x4x_EVENT( p_doc, false, true, &b_new_fmt   ) ){ _err = pxtnERR_io_r_v4_Event  ; goto End; } break;
		case _TAG_x3x_pxtnUNIT: if( !_io_Read_OldUnit              ( p_doc, &b_new_fmt, 3             ) ){ _err = pxtnERR_io_r_v3_Unit   ; goto End; } break;
		case _TAG_x1x_PROJ    : if( !_x1x_Project_Read             ( p_doc                            ) ){ _err = pxtnERR_io_r_v1_Project; goto End; } break;
		case _TAG_x1x_UNIT    : if( !_io_Read_OldUnit              ( p_doc, &b_new_fmt, 1             ) ){ _err = pxtnERR_io_r_v1_Unit   ; goto End; } break;
		case _TAG_x1x_PCM     : if( !_io_Read_Woice                ( p_doc, &b_new_fmt, pxtnWOICE_PCM ) ){ _err = pxtnERR_io_r_v1_PCM    ; goto End; } break;
		case _TAG_x1x_EVEN    : if( !evels ->io_Unit_Read_x4x_EVENT( p_doc, true, false, &b_new_fmt   ) ){ _err = pxtnERR_io_r_v1_Event  ; goto End; } break;
		case _TAG_x1x_END     : b_end = true; break;									 
																						 
		default: _err = pxtnERR_io_r_Unknown; goto End;
		}
	}
	
/*
	for( const EVERECORD* p = TuneData_Event_get_Records(); p; p = p->next )
	{
		char str[ 100 ];
		sprintf( str, "%08d, %d, %d, %d\n", p->clock, p->unit_no, p->kind, p->value );
		OutputDebugString( str );
	}
*/
	b_ret = true;
End:
//	if( b_new_fmt ) _SetErrorText( "it's new format" );
	
	return b_ret;

}



#define _MAX_FMTVER_x1x_EVENTNUM 10000

bool pxtnService::_ReadVersion( pxwrDoc *p_doc, _enum_FMTVER *p_fmt_ver, unsigned short *p_exe_ver )
{
	char version[ _VERSIONSIZE  ] = {'\0'};
	unsigned short dummy;

	if( !p_doc->r( version, 1, _VERSIONSIZE ) ){ _err = pxtnERR_io_r_Version; return false; }

	// fmt version
	if(      !memcmp( version, _code_proj_x1x , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_x1x; *p_exe_ver = 0; return true; }
	else if( !memcmp( version, _code_proj_x2x , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_x2x; *p_exe_ver = 0; return true; }
	else if( !memcmp( version, _code_proj_x3x , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_x3x;                              }
	else if( !memcmp( version, _code_proj_x4x , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_x4x;							  }
	else if( !memcmp( version, _code_proj_v5  , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_v5 ;							  }
	else if( !memcmp( version, _code_tune_x2x , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_x2x; *p_exe_ver = 0; return true; }
	else if( !memcmp( version, _code_tune_x3x , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_x3x;							  }
	else if( !memcmp( version, _code_tune_x4x , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_x4x;							  }
	else if( !memcmp( version, _code_tune_v5  , _VERSIONSIZE ) ){ *p_fmt_ver = _enum_FMTVER_v5 ;							  }
	else                                                        { _err = pxtnERR_io_r_VerUnknown; return false; }

	// exe version
	if( !p_doc->r( p_exe_ver, sizeof(unsigned short), 1 ) ){ _err = pxtnERR_io_r_VersionExe; return false; }
	if( !p_doc->r( &dummy   , sizeof(unsigned short), 1 ) ){ _err = pxtnERR_io_r_Dummy; return false; }

	return true;
}

// fix old key event
bool pxtnService::_x3x_CorrectKeyEvent()
{
	if( _unit_num > _woice_num ) return false;

	for( long u = 0; u < _unit_num; u++ )
	{
		if( u >= _woice_num ) return false;

		int change_value = _woices[ u ]->get_x3x_basic_key() - EVENTDEFAULT_BASICKEY;

		if( !evels->get_Count( (unsigned char)u, (unsigned char)EVENTKIND_KEY ) )
		{
			evels->Record_Add_i( 0, (unsigned char)u, EVENTKIND_KEY, (long)0x6000 );
		}
		evels->Record_Value_Change( 0, -1, (unsigned char)u, EVENTKIND_KEY, change_value );
	}
	return true;
}

// fix old correct (1.0)
bool pxtnService::_x3x_AddCorrectEvent()
{
	if( _unit_num > _woice_num ) return false;

	for( int u = 0; u < _unit_num; u++ )
	{
		float correct= _woices[ u ]->get_x3x_correct();
		if( correct ) evels->Record_Add_f( 0, (unsigned char)u, EVENTKIND_CORRECT, correct );
	}

	return true;
}

void pxtnService::_x3x_SetVoiceNames()
{
	for( int i = 0; i < _woice_num; i++ )
	{
		char name[ MAX_TUNEWOICENAME + 1 ];
		sprintf( name, "voice_%02d", i );
		_woices[ i ]->set_name( name );
	}
}

long pxtnService::PreCountEvent( pxwrDoc *p_doc, long max_unit )
{
	bool           b_ret   = false;
	bool           b_end   = false;

	long           count   = 0;
	long           size;
	char code   [ _CODESIZE + 1 ] = {'\0'};

	unsigned short exe_ver;
	_enum_FMTVER   fmt_ver;

	if( !_ReadVersion( p_doc, &fmt_ver, &exe_ver ) ) goto End;
	if( fmt_ver == _enum_FMTVER_x1x ){ count = _MAX_FMTVER_x1x_EVENTNUM; b_ret = true; goto End; }

	while( !b_end )
	{
		if( !p_doc->r( code, 1, _CODESIZE ) ){ _err = pxtnERR_io_r_TagCode; goto End; }

		switch( _CheckTagCode( code ) )
		{
		case _TAG_Event_V5    : count += evels ->io_Read_EventNum    ( p_doc ); break;
		case _TAG_MasterV5    : count += master->io_r_v5_EventNum    ( p_doc ); break;
		case _TAG_x4x_evenMAST: count += master->io_r_x4x_EventNum   ( p_doc ); break;
		case _TAG_x4x_evenUNIT: count += evels ->io_Read_x4x_EventNum( p_doc ); break;
		case _TAG_pxtoneND    : b_end = true;                                   break;

		// skip
		case _TAG_antiOPER    :
		case _TAG_num_UNIT    :
		case _TAG_x3x_pxtnUNIT:
		case _TAG_matePCM     : 
		case _TAG_matePTV     : 
		case _TAG_matePTN     : 
		case _TAG_mateOGGV    : 
		case _TAG_effeDELA    :
		case _TAG_effeOVER    :
//		case _TAG_effeSTRA    :
		case _TAG_textNAME    :
		case _TAG_textCOMM    :
		case _TAG_assiUNIT    :
		case _TAG_assiWOIC    :

			if( !p_doc->r( &size, sizeof(long), 1 ) ){ _err = pxtnERR_io_r_FactSize; goto End; }
			if( !p_doc->Seek( SEEK_CUR, size )      ){ _err = pxtnERR_io_r_Seek    ; goto End; }
			break;

		// ignore
		case _TAG_x1x_PROJ    :
		case _TAG_x1x_UNIT    :
		case _TAG_x1x_PCM     :
		case _TAG_x1x_EVEN    :
		case _TAG_x1x_END     : goto End;
		default               : goto End;

		}
	}

	if( fmt_ver <= _enum_FMTVER_x3x ) count += max_unit * 4; // voice_no, group_no, key correct, key event x3x
	
	b_ret = true;
End:

	if( !b_ret ) count = 0;
	
	return count;
}


bool pxtnService::Read( pxwrDoc *p_doc, bool bPermitPTTUNE )
{
	bool             b_ret = false;
	unsigned short   exe_ver;
	_enum_FMTVER     fmt_ver;

	Clear( false );

	if( !_ReadVersion(   p_doc, &fmt_ver, &exe_ver ) ) goto End;

	if( fmt_ver >= _enum_FMTVER_v5 ) evels->Linear_Start  ();
	else                             evels->x4x_Read_Start();

	if( !_ReadTuneItems( p_doc                     ) ) goto End;

	if( fmt_ver >= _enum_FMTVER_v5 ) evels->Linear_End( true );

	if( fmt_ver <= _enum_FMTVER_x3x )
	{
		if( !_x3x_CorrectKeyEvent() ) goto End;
		if( !_x3x_AddCorrectEvent() ) goto End;
		_x3x_SetVoiceNames();
	}

	if( !bPermitPTTUNE && master->get_beat_clock() != EVENTDEFAULT_BEATCLOCK ){ _err = pxtnERR_io_r_BeatClock; goto End; }

	{
		int clock1 = evels ->get_Max_Clock ();
		int clock2 = master->get_last_clock();

		if( clock1 > clock2 ) master->AdjustMeasNum( clock1 );
		else                  master->AdjustMeasNum( clock2 );
	}
	
	b_ret = true;
End:

	if( !b_ret ) Clear( false );

	return b_ret;

}







// x1x project..------------------


#define _MAX_PROJECTNAME_x1x 16

// project (36byte) ================
typedef struct
{
	char           x1x_name[_MAX_PROJECTNAME_x1x];

	float          x1x_beat_tempo;
	unsigned short x1x_beat_clock;
	unsigned short x1x_beat_num;
	unsigned short x1x_beat_note;
	unsigned short x1x_meas_num;

	unsigned short x1x_channel_num;
	unsigned short x1x_bps;
	unsigned long  x1x_sps;
}
_x1x_PROJECT;

/*
#define _DUMMY_MEASNUM        1
#define _DUMMY_BEATNOTE       4
#define _DUMMY_BPS           16
#define _DUMMY_SPS        44100
#define _DUMMY_CHANNELNUM     2

bool _x1x_Project_WriteFile( FILE *fp )
{
	_PROJECT prjc;
	long     size;
	long     beat_num, beat_clock;
	float    beat_tempo;

	if( !fp ) return false;

	TuneData_Master_Get( &beat_num, &beat_tempo, &beat_clock, NULL );
	memset( &prjc, 0,  sizeof(_PROJECT) );
	memcpy( prjc.x1x_name, TuneData_Text_Get_Name(), MAX_PROJECTNAME );

	prjc.x1x_beat_clock  = (unsigned short)beat_clock;
	prjc.x1x_beat_num    = (unsigned short)beat_num;
	prjc.x1x_beat_tempo  =                 beat_tempo;
	prjc.x1x_meas_num    = (unsigned short)_DUMMY_MEASNUM;
	prjc.x1x_beat_note   = (unsigned short)_DUMMY_BEATNOTE;
	prjc.x1x_bps         = (unsigned short)_DUMMY_BPS;
	prjc.x1x_sps         = (unsigned long )_DUMMY_SPS;
	prjc.x1x_channel_num = (unsigned short)_DUMMY_CHANNELNUM;

	// prjc ----------
	size = sizeof( _PROJECT );
	if( fwrite( &size, sizeof(unsigned long),  1, fp ) != 1 ) return false;
	if( fwrite( &prjc, size,                   1, fp ) != 1 ) return false;

	return true;
}
*/

bool pxtnService::_x1x_Project_Read( pxwrDoc *p_doc )
{
	_x1x_PROJECT prjc;
	char     name[ _MAX_PROJECTNAME_x1x + 1 ];
	long     beat_num, beat_clock;
	long     size;
	float    beat_tempo;

	memset( &prjc, 0, sizeof( _x1x_PROJECT ) );
	if( !p_doc->r( &size, 4,                      1 ) ) return false;
	if( !p_doc->r( &prjc, sizeof( _x1x_PROJECT ), 1 ) ) return false;

	memset( name, 0, _MAX_PROJECTNAME_x1x + 1 );
	memcpy( name, prjc.x1x_name, _MAX_PROJECTNAME_x1x );
	beat_num   = prjc.x1x_beat_num;
	beat_tempo = prjc.x1x_beat_tempo;
	beat_clock = prjc.x1x_beat_clock;

	text->set_name( name );
	master->Set(beat_num, beat_tempo, beat_clock );

	return true;
}
