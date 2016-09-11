//
//  pxwrDoc.h
//  ipxTest1
//
//  Created by Daisuke Amaya on 11/08/12.
//  Copyright 2011 Pixel. All rights reserved.
//

#ifndef pxwrDoc_H
#define pxwrDoc_H

#include <stdint.h>

enum pxwrSEEK
{
	pxwrSEEK_set = 0,
	pxwrSEEK_cur,
	pxwrSEEK_end,
	pxwrSEEK_num
};

class pxwrDoc
{
private:
	
	char *_p    ;
	bool _b_file;
	int  _len   ;
	int  _ofs   ;
	
public:
	
	 pxwrDoc();
	~pxwrDoc();
	
	//bool Open_res ( const char *dir, const char *name, const char* mode, bool b_resource );
	bool Open_path( const char *path,                  const char* mode                  );
	bool SetRead  ( void *p, int len  );
	bool Seek     ( int mode, int val );
	void Close   ();
	
	bool w   ( const void *p, int size, int num );
	bool r   (       void *p, int size, int num );	
	void *GetFilePointer(){ return _p; }

	int  v_w  ( int val, int *p_add );
	bool v_r  ( int *p  );

	bool r_txt( void *p    , int buf_size );
	bool gets ( char *p_buf, int buf_size );

	bool w_arg( const char *fmt, ... );

	int FileSize() const;
};

int  pxwrDoc_v_chk( int val );

#endif
