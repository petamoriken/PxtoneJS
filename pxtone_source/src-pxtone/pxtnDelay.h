// '12/03/03

#ifndef pxtnDelay_H
#define pxtnDelay_H

#include <pxwrDoc.h>

#include "./pxtnMax.h"

enum DELAYUNIT
{
	DELAYUNIT_Beat = 0,
	DELAYUNIT_Meas,
	DELAYUNIT_Second,
	DELAYUNIT_num,
};

#define DEFAULT_DELAYSCALE       DELAYUNIT_Beat
#define DEFAULT_DELAYFREQUENCY    3.3f
#define DEFAULT_DELAYRATE        33.0f


class pxtnDelay
{
private:
	bool           _b_played;
	DELAYUNIT      _unit    ;
	long           _group   ;
	float          _rate    ;
	float          _freq    ;

	int  _smp_num   ;
	int  _offset    ;
	int  *_bufs[ MAX_CHANNEL ];
	int  _rate_long ;
	//double rate; // .rate / 100 (%)


public :

	 pxtnDelay();
	~pxtnDelay();

	bool Tone_Ready( int beat_num, float beat_tempo, int sps, int bps );
	void Tone_Supple( int ch, long *group_smps );
	void Tone_Increment();
	void Tone_Release  ();
	void Tone_Clear    ();

	bool Add_New    ( DELAYUNIT scale, float freq, float rate, long group );

	bool Write( pxwrDoc *p_doc ) const;
	bool Read ( pxwrDoc *p_doc, bool *pb_new_fmt );


	DELAYUNIT get_unit ()const;
	float     get_freq ()const;
	float     get_rate ()const;
	int       get_group()const;

	void      Set( DELAYUNIT unit, float freq, float rate, int group );

	bool      get_played()const;
	void      set_played( bool b );
	bool      switch_played();
};



#endif
