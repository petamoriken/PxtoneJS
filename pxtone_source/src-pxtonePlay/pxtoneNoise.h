// 12/03/29

#ifndef pxtoneNoise_H
#define pxtoneNoise_H

#include <pxwrDoc.h>

class pxtoneNoise
{
private:

	void *_bldr;
	int  _ch   ;
	int  _sps  ;
	int  _bps  ;

public:
	 pxtoneNoise();
	~pxtoneNoise();

	bool Init();

	bool SetQuality( int ch, int sps, int bps );

	bool Sample    ( pxwrDoc *p_doc, void **pp_buf, int *p_size ) const;
};

#endif
