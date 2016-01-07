// '12/03/03

#ifndef pxtnUnit_H
#define pxtnUnit_H

#include <pxwrDoc.h>

#include "./pxtnMax.h"
#include "./pxtnWoice.h"


class pxtnUnit
{
private:

	bool _bOperated;
	bool _bPlayed;
	char _name[  MAX_TUNEUNITNAME + 1 ];

	//	TUNEUNITTONESTRUCT
	long  _key_now;
	long  _key_start;
	long  _key_margin;
	long  _portament_sample_pos;
	long  _portament_sample_num;
	long  _pan_vols     [ MAX_CHANNEL ];
	long  _pan_times    [ MAX_CHANNEL ];
	long  _pan_time_bufs[ MAX_CHANNEL ][ pxtnBUFSIZE_TIMEPAN ];
	long  _v_VOLUME  ;
	long  _v_VELOCITY;
	long  _v_GROUPNO ;
	float _v_CORRECT ;

	const pxtnWoice *_p_w;

	pxtnVOICETONE _vts[ MAX_UNITCONTROLVOICE ];

public :
	 pxtnUnit();
	~pxtnUnit();

	void Tone_Init ();

	void Tone_Clear();

	void Tone_Reset_and_2prm( int voice_idx, int env_rls_clock, float offset_freq );
	void Tone_Envelope ();
	void Tone_KeyOn    ();
	void Tone_ZeroLives();
	void Tone_Key       ( long key );
	void Tone_Pan_Volume( int ch, long pan );
	void Tone_Pan_Time  ( int ch, long pan, int sps );

	void Tone_Velocity ( long  val );
	void Tone_Volume   ( long  val );
	void Tone_Portament( long  val );
	void Tone_GroupNo  ( long  val );
	void Tone_Correct  ( float val );

	void Tone_Sample   ( bool b_mute, int ch_num, long time_pan_index, long smooth_smp );
	void Tone_Supple   ( long *group_smps, int ch, long time_pan_index ) const;
	long Tone_Increment_Key   ();
	void Tone_Increment_Sample( float freq );

	void set_woice( const pxtnWoice *p_w );
	void set_name ( const char *name     );
	const pxtnWoice *get_woice() const;
	const char      *get_name () const;
	
	pxtnVOICETONE *get_tone( int voice_idx );

	void set_operated( bool b );
	void set_played  ( bool b );
	bool get_operated() const;
	bool get_played  () const;

	
//	bool Write   ( pxwrDoc *p_doc, int idx ) const;
//	bool Read    ( pxwrDoc *p_doc, bool *pb_new_fmt );
	bool Read_v3x( pxwrDoc *p_doc, bool *pb_new_fmt, int *p_group );
	bool Read_v1x( pxwrDoc *p_doc,                   int *p_group );

};

#endif
