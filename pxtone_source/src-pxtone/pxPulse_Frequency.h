#ifndef pxPulse_Frequency_H
#define pxPulse_Frequency_H

class pxPulse_Frequency
{
private:

	float  *_freq_table;
	double _GetDivideOctaveRate( long divi );

public:

	 pxPulse_Frequency();
	~pxPulse_Frequency();

	bool Init();

	float        Get      ( long key     );
	float        Get2     ( long key     );
	const float* GetDirect( long *p_size );
};

#endif
