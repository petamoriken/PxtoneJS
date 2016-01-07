#ifndef pxPulse_NoiseBuilder_H
#define pxPulse_NoiseBuilder_H

#include "./pxPulse_Noise.h"

class pxPulse_NoiseBuilder
{
private:

	bool  _b_init;
	short *_p_tables[ pxWAVETYPE_num ];
	long  _rand_buf [ 2 ];

	void  _random_reset();
	short _random_get  ();

	pxPulse_Frequency *_freq;

public :

	 pxPulse_NoiseBuilder();
	~pxPulse_NoiseBuilder();

	bool Init();

	pxPulse_PCM *BuildNoise( pxPulse_Noise *p_noise, long ch, long sps, long bps ) const;
};

#endif
