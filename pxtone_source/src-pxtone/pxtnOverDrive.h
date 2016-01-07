// '12/03/03

#ifndef pxtnOverDrive_H
#define pxtnOverDrive_H

#include <pxwrDoc.h>

#define TUNEOVERDRIVE_CUT_MAX       99.9f
#define TUNEOVERDRIVE_CUT_MIN       50.0f
#define TUNEOVERDRIVE_AMP_MAX        8.0f
#define TUNEOVERDRIVE_AMP_MIN        0.1f

#define TUNEOVERDRIVE_DEFAULT_CUT   90.0f
#define TUNEOVERDRIVE_DEFAULT_AMP    2.0f

class pxtnOverDrive
{
private:

	bool  _b_played;

	int   _group   ;
	float _cut_f   ;
	float _amp_f   ;

	int   _cut_16bit_top;
public :


	 pxtnOverDrive();
	~pxtnOverDrive();

	void Tone_Ready();
	void Tone_Supple( long *group_smps ) const;

	bool Write( pxwrDoc *p_doc ) const;
	bool Read ( pxwrDoc *p_doc, bool *pb_new_fmt );


	float get_cut  ()const;
	float get_amp  ()const;
	int   get_group()const;

	void  Set( float cut, float amp, int group );

	bool  get_played()const;
	void  set_played( bool b );
	bool  switch_played();

};

#endif
