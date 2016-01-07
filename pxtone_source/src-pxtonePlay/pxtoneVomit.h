// '12/03/13

// support: 11025,22050,44100Hz / 8bit,16bit / mono, stereo.

#ifndef pxtoneVomit_H
#define pxtoneVomit_H

#include <pxwrDoc.h>

class pxtoneVomit
{
private:

	bool _b_init ;
	bool _b_vomit;

	void *_pxtn  ;

public :

	 pxtoneVomit();
	~pxtoneVomit();

	bool Init ();
	bool Read ( pxwrDoc *p_doc );
	bool Clear();
	bool Start( int sampling_position, float fade_in_sec );

	bool set_quality ( int ch, int sps, int bps );
	bool set_loop    ( bool b_loop         );
	bool set_volume  ( float volume        ); // 1.0f = 100%
	int  set_fade    ( int fade, float sec );

	bool is_vomiting() const;

	const char *get_title     () const;
	const char *get_comment   () const;
	const char *get_last_error() const;

	bool get_info( int *p_beat_num, float *p_beat_tempo, int *p_beat_clock, int *p_meas_num ) const;
	int  get_meas_repeat() const;
	int  get_meas_play  () const;

	bool vomit( void *p_buf, int buf_size );
};


int pxtoneVomit_Calc_sample_num( int meas_num, int beat_num, int sps, float beat_tempo );

#endif
