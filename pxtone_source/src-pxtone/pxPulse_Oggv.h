#ifndef pxPulse_Oggv_H
#define pxPulse_Oggv_H

#include <pxwrDoc.h>

#include "./pxPulse_PCM.h"

class pxPulse_Oggv
{
private:

	int   _ch     ;
	int   _sps2   ;
	int   _smp_num;
	int   _size   ;
	char* _p_data ;

	bool  _SetInformation();

public :

	 pxPulse_Oggv();
	~pxPulse_Oggv();

	bool Load   ( const char* path   );
	bool Save   ( const char* path   ) const;
	bool Decode ( pxPulse_PCM *p_pcm ) const;
	void Release();
	bool GetInfo( int* p_ch, int* p_sps, int* p_smp_num );
	int  GetSize() const;
	bool Write  ( pxwrDoc *p_doc ) const;
	bool Read   ( pxwrDoc *p_doc );
	bool Copy   ( pxPulse_Oggv *p_dst ) const;
};

#endif
