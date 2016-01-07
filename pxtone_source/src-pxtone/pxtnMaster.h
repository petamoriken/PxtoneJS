// '12/03/03

#ifndef pxtnMaster_H
#define pxtnMaster_H

#include <pxwrDoc.h>

class pxtnMaster
{
private:
	int   _beat_num   ;
	float _beat_tempo ;
	int   _beat_clock ;
	int   _meas_num   ;
	int   _repeat_meas;
	int   _last_meas  ;
	int   _volume_    ;

public :
	 pxtnMaster();
	~pxtnMaster();

	void  Reset();

	void  Set( int    beat_num, float    beat_tempo, int    beat_clock );
	void  Get( int *p_beat_num, float *p_beat_tempo, int *p_beat_clock ) const;

	int   get_beat_num   ()const;
	float get_beat_tempo ()const;
	int   get_beat_clock ()const;
	int   get_meas_num   ()const;
	int   get_repeat_meas()const;
	int   get_last_meas  ()const;
	int   get_last_clock ()const;
	int   get_play_meas  ()const;

	void  set_meas_num   ( int meas_num );
	void  set_repeat_meas( int meas     );
	void  set_last_meas  ( int meas     );

	void  AdjustMeasNum  ( int clock    );

	int   get_this_clock( int meas, int beat, int clock ) const;

	bool io_w_v5          ( pxwrDoc *p_doc, int rough ) const;
	bool io_r_v5          ( pxwrDoc *p_doc, bool *pb_new_fmt );
	int  io_r_v5_EventNum ( pxwrDoc *p_doc );

	bool io_r_x4x         ( pxwrDoc *p_doc, bool *pb_new_fmt );
	int  io_r_x4x_EventNum( pxwrDoc *p_doc );
};

#endif
