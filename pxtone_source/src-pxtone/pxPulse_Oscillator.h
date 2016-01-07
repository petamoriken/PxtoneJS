#ifndef pxPlus_Oscillator_H
#define pxPlus_Oscillator_H

#include "./pxTypedef.h"

typedef double (* FUNCTION_OSCILLATORGET )( long index );

class pxPulse_Oscillator
{
private:

	s32POINT *_p_point  ;
	long     _point_num ;
	long     _point_reso;
	long     _volume    ;
	long     _sample_num;

public:

	pxPulse_Oscillator();

	void   ReadyGetSample( s32POINT *p_point, long point_num, long volume, long sample_num, long point_reso );
	double GetOneSample_Overtone ( long index );
	double GetOneSample_Coodinate( long index );
};

#endif
