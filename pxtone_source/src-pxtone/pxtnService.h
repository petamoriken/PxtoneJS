#ifndef pxtnService_H
#define pxtnService_H


#include <pxwrDoc.h>
#include "./pxPulse_NoiseBuilder.h"

#include "./pxtnMax.h"
#include "./pxtnText.h"
#include "./pxtnDelay.h"
#include "./pxtnOverDrive.h"
#include "./pxtnMaster.h"
#include "./pxtnWoice.h"
#include "./pxtnUnit.h"
#include "./pxtnEvelist.h"

#define PXTONEERRORSIZE 64

enum pxtnERRORS
{
	pxtnERR_None = 0,
	pxtnERR_NoiseBuilder_Init,
	pxtnERR_EventList_Allocate,
	pxtnERR_Allocate,

	pxtnERR_io_w_Version,
	pxtnERR_io_w_ExeVersion,
	pxtnERR_io_w_Dummy,
	pxtnERR_io_w_TagCode,
	pxtnERR_io_w_Master,
	pxtnERR_io_w_Events,

	pxtnERR_io_w_Name,
	pxtnERR_io_w_Comment,
	pxtnERR_io_w_Delay,
	pxtnERR_io_w_OverDrive,
	pxtnERR_io_w_PCM,
	pxtnERR_io_w_PTV,
	pxtnERR_io_w_PTN,
	pxtnERR_io_w_OGGV,

	pxtnERR_io_w_WoiceAssist,
	pxtnERR_io_w_UnitNum    ,
	pxtnERR_io_w_UnitAssist ,
	pxtnERR_io_w_EndSize    ,

	pxtnERR_io_r_TagCode    ,
	pxtnERR_io_r_AntiEdit   ,
	pxtnERR_io_r_UnitNum    ,
	pxtnERR_io_r_Master     ,
	pxtnERR_io_r_Events     ,
	pxtnERR_io_r_PCM        ,
	pxtnERR_io_r_PTV        ,
	pxtnERR_io_r_PTN        ,
	pxtnERR_io_r_OGGV       ,
	pxtnERR_io_r_Delay      ,
	pxtnERR_io_r_OverDrive  ,
	pxtnERR_io_r_Title      ,
	pxtnERR_io_r_Coment     ,
	pxtnERR_io_r_WoiceAssist,
	pxtnERR_io_r_UnitAssist ,

	pxtnERR_io_r_v4_Master  ,
	pxtnERR_io_r_v4_Event   ,
	pxtnERR_io_r_v3_Unit    ,
	pxtnERR_io_r_v1_Project ,
	pxtnERR_io_r_v1_Unit    ,
	pxtnERR_io_r_v1_PCM     ,
	pxtnERR_io_r_v1_Event   ,
	pxtnERR_io_r_Unknown    ,

	pxtnERR_io_r_Version    ,
	pxtnERR_io_r_VerUnknown ,
	pxtnERR_io_r_VersionExe ,
	pxtnERR_io_r_Dummy      ,

	pxtnERR_io_r_FactSize   ,
	pxtnERR_io_r_Seek       ,

	pxtnERR_io_r_BeatClock  ,

	pxtnERR_num
};

typedef struct
{
	long  meas_start  ;
	long  meas_end    ;
	long  meas_repeat ;
	long  start_sample; // for restart.
	long  fadein_msec ;
//	float volume      ; // 0.0 - 1.0
}
pxtnVOMITPREPARATION;


class pxtnService
{
private:


	enum _enum_FMTVER
	{
		_enum_FMTVER_x1x = 0, // fix event num = 10000
		_enum_FMTVER_x2x,     // no version of exe
		_enum_FMTVER_x3x,     // unit has voice / basic-key for only view
		_enum_FMTVER_x4x,     // unit has event
		_enum_FMTVER_v5 ,
	};

	pxtnERRORS _err;

	int _ch, _sps, _bps;

	pxPulse_NoiseBuilder *_ptn_bldr;

	int _delay_max;	int _delay_num;	pxtnDelay     **_delays;
	int _ovdrv_max;	int _ovdrv_num;	pxtnOverDrive **_ovdrvs;
	int _woice_max;	int _woice_num;	pxtnWoice     **_woices;
	int _unit_max ;	int _unit_num ;	pxtnUnit      **_units ;

	int        _group_num;

	bool _ReadVersion      ( pxwrDoc *p_doc, _enum_FMTVER *p_fmt_ver, unsigned short *p_exe_ver );
	bool _ReadTuneItems    ( pxwrDoc *p_doc );
	bool _x1x_Project_Read ( pxwrDoc *p_doc );

	bool _io_Read_Delay    ( pxwrDoc *p_doc, bool *pb_new_fmt );
	bool _io_Read_OverDrive( pxwrDoc *p_doc, bool *pb_new_fmt );
	bool _io_Read_Woice    ( pxwrDoc *p_doc, bool *pb_new_fmt, pxtnWOICETYPE type );
	bool _io_Read_OldUnit  ( pxwrDoc *p_doc, bool *pb_new_fmt, int ver        );

	bool _io_assiWOIC_w    ( pxwrDoc *p_doc, int idx          ) const;
	bool _io_assiWOIC_r    ( pxwrDoc *p_doc, bool *pb_new_fmt );
	bool _io_assiUNIT_w    ( pxwrDoc *p_doc, int idx          ) const;
	bool _io_assiUNIT_r    ( pxwrDoc *p_doc, bool *pb_new_fmt );

	bool _io_UNIT_num_w    ( pxwrDoc *p_doc ) const;
	int  _io_UNIT_num_r    ( pxwrDoc *p_doc, bool *pb_new_fmt );

	bool _x3x_CorrectKeyEvent();
	bool _x3x_AddCorrectEvent();
	void _x3x_SetVoiceNames  ();

	//////////////
	// Vomit..
	//////////////
	bool  _vmt_b_ready   ;
	bool  _vmt_b_init    ;

	bool  _vmt_b_mute    ;
	bool  _vmt_b_loop    ;

	long  _vmt_smp_smooth;
	float _vmt_clock_rate; // as the sample
	long  _vmt_smp_count ;
	long  _vmt_smp_start ;
	long  _vmt_smp_end   ;
	long  _vmt_smp_repeat;
		
	long  _vmt_fade_count;
	long  _vmt_fade_max  ;
	long  _vmt_fade_fade ;
	float _vmt_master_vol;
		
	int   _vmt_top;
	long  _vmt_smp_skip   ;
	long  _vmt_time_pan_index;

	float _vmt_bt_tempo;

	// for make now-meas
	long  _vmt_bt_clock;
	long  _vmt_bt_num  ;

	long  *_vmt_group_smps;


	const EVERECORD   *_vmt_p_eve;

	pxPulse_Frequency *_vmt_freq ;

	void _vmt_constructor();
	void _vmt_destructer ();
	bool _vmt_init       ();


	void _vmt_ResetVoiceOn( pxtnUnit *p_u, long w ) const;
	void _vmt_InitUnitTone();
	bool _vmt_PXTONE_SAMPLE( void *p_data );

public :

	 pxtnService();
	~pxtnService();

	pxtnText    *text  ;
	pxtnMaster  *master;
	pxtnEvelist *evels ;

	bool Init         ( bool b_reserve_evels ); // ptc reserves evels.
	void Clear        ( bool b_release_evels ); // ptc doesn't release evels.

	bool Save         ( pxwrDoc *p_doc, bool bTune, unsigned short exe_ver );
	long PreCountEvent( pxwrDoc *p_doc, long max_unit      );
	bool Read         ( pxwrDoc *p_doc, bool bPermitPTTUNE );
	void AdjustMeasNum();

//	const char *GetIOError();

	const char *get_last_error_text() const;

	bool Tone_Ready();
	void Tone_Clear();

	int  Group_Num() const;

	// delay.
	int  Delay_Num() const;
	int  Delay_Max() const;
	bool Delay_Set         ( int idx, DELAYUNIT unit, float freq, float rate, int group );
	bool Delay_Add         (          DELAYUNIT unit, float freq, float rate, int group );
	bool Delay_Remove      ( int idx );
	bool Delay_ReadyTone   ( int idx );
	pxtnDelay *Delay_Get   ( int idx );


	// over drive.
	int  OverDrive_Num() const;
	int  OverDrive_Max() const;
	bool OverDrive_Set          ( int idx, float cut, float amp, int group );
	bool OverDrive_Add          (          float cut, float amp, int group );
	bool OverDrive_Remove       ( int idx );
	void OverDrive_ReadyTone    ( int idx );
	pxtnOverDrive *OverDrive_Get( int idx );

	// woice.
	int  Woice_Num() const;
	int  Woice_Max() const;
	const pxtnWoice *Woice_Get( int idx ) const;
	pxtnWoice       *Woice_Get_variable( int idx );

	bool Woice_Load     ( int idx, const char *path, pxtnWOICETYPE type, bool *pb_new_fmt );
	bool Woice_ReadyTone( int idx );
	void Woice_Remove   ( int idx );
	void Woice_Replace  ( int old_place, int new_place );

	// unit.
	int   Unit_Num() const;
	int   Unit_Max() const;
	const pxtnUnit *Unit_Get         ( int idx ) const;
	pxtnUnit       *Unit_Get_variable( int idx );

	void Unit_Remove   ( int idx );
	void Unit_Replace  ( int old_place, int new_place );
	bool Unit_AddNew   ();
	void Unit_SetOpratedAll( bool b );
	void Unit_Solo( int idx );

	// q
	void Quality_Set( int    ch, int    sps, int    bps );
	void Quality_Get( int *p_ch, int *p_sps, int *p_bps ) const;


	//////////////
	// Vomit..
	//////////////

	bool vmt_is_ready() const;

	void vmt_set_mute( bool b );
	void vmt_set_loop( bool b );
	void vmt_set_fade( long fade, long msec );
	void vmt_set_master_volume( float v );

	int  vmt_get_now_clock      () const;
	int  vmt_get_sampling_offset() const;

	bool vmt_preparation( const pxtnVOMITPREPARATION *p_build );

	bool Vomit( void* p_buf, long size );
};

int pxtnService_vmt_CalcSampleNum( int meas_num, int beat_num, int sps, float beat_tempo );


#endif
