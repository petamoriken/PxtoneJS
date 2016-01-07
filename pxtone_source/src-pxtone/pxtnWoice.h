// '12/03/03

#ifndef pxtnWoice_H
#define pxtnWoice_H

#include <pxwrDoc.h>

#include "./pxPulse_Noise.h"
#include "./pxPulse_NoiseBuilder.h"
#include "./pxPulse_PCM.h"
#include "./pxPulse_Oggv.h"

#define MAX_TUNEWOICENAME   16 // fixture.

#define MAX_UNITCONTROLVOICE 2 // max-woice per unit

#define pxtnBUFSIZE_TIMEPAN  0x40

#define PTV_VOICEFLAG_WAVELOOP   0x00000001
#define PTV_VOICEFLAG_SMOOTH     0x00000002
#define PTV_VOICEFLAG_BEATFIT    0x00000004
#define PTV_VOICEFLAG_UNCOVERED  0xfffffff8

#define PTV_DATAFLAG_WAVE        0x00000001
#define PTV_DATAFLAG_ENVELOPE    0x00000002
#define PTV_DATAFLAG_UNCOVERED   0xfffffffc

enum pxtnWOICETYPE
{
	pxtnWOICE_None = 0,
	pxtnWOICE_PCM ,
	pxtnWOICE_PTV ,
	pxtnWOICE_PTN ,
	pxtnWOICE_OGGV,
};

enum pxtnVOICETYPE
{
	pxtnVOICE_Coodinate = 0,
	pxtnVOICE_Overtone ,
	pxtnVOICE_Noise    ,
	pxtnVOICE_Sampling ,
	pxtnVOICE_OggVorbis,
};

typedef struct
{
	long          smp_head_w ;
	long          smp_body_w ;
	long          smp_tail_w ;
	unsigned char * p_smp_w  ;

	unsigned char * p_env    ;
	long          env_size   ;
	long          env_release;
}
pxtnVOICEWORK;

typedef struct
{
	int       fps     ;
	int       head_num;
	int       body_num;
	int       tail_num;
	s32POINT* points;
}
pxtnVOICEENVELOPE;

typedef struct
{
	int      num    ;
	int      reso   ; // COODINATERESOLUTION
	s32POINT *points;
}
pxtnVOICEWAVE;

typedef struct
{
	int               basic_key  ;
	int               volume     ;
	int               pan        ;
	float             correct    ;
	unsigned long     voice_flags;
	unsigned long     data_flags ;
					  
	pxtnVOICETYPE     type       ;
	pxPulse_PCM       *p_pcm     ;
	pxPulse_Oggv      *p_oggv    ;
	pxPulse_Noise     *p_ptn     ;

	pxtnVOICEWAVE     wave       ;
	pxtnVOICEENVELOPE envelope   ;
}
pxtnVOICEUNIT;

typedef struct
{
	double smp_pos    ;       
	float  offset_freq;
	long   env_volume ;
	long   life_count ;
	long   on_count   ;

	long   smp_count  ;
	long   env_start  ;
	long   env_pos    ;
	long   env_release_clock;

	long   smooth_volume;
}
pxtnVOICETONE;


class pxtnWoice
{
private:

	int           _voice_num;
	char          _name[ MAX_TUNEWOICENAME + 1 ];
	pxtnWOICETYPE _type;
	pxtnVOICEUNIT *_vcs ;
	pxtnVOICEWORK *_vws ;

	float         _x3x_correct;
	int           _x3x_basic_key; // correct old-fmt when key-event

public :
	 pxtnWoice();
	~pxtnWoice();

	int           get_voice_num    () const;
	float         get_x3x_correct  () const;
	int           get_x3x_basic_key() const;
	pxtnWOICETYPE get_type         () const;
	const char    *get_name        () const;
	const pxtnVOICEUNIT *get_voice         ( int idx ) const;
	pxtnVOICEUNIT       *get_voice_variable( int idx );

	const pxtnVOICEWORK *get_work ( int idx ) const;

	void set_name( const char *name );

	bool Voice_Allocate( long voice_num );
	void Voice_Release ();
	bool Copy( pxtnWoice *p_dst ) const;
	void Slim();

	bool Load( const char *path, pxtnWOICETYPE type, bool *pb_new_fmt );

	
	bool PTV_Write   ( pxwrDoc *p_doc, int *p_total     ) const;
	bool PTV_Read    ( pxwrDoc *p_doc, bool *pb_new_fmt );
	bool PTV_Save    ( const char* path                 ) const;

	bool io_matePCM_w(  pxwrDoc *p_doc ) const;
	bool io_matePCM_r(  pxwrDoc *p_doc, bool *pb_new_fmt );

	bool io_matePTN_w(  pxwrDoc *p_doc ) const;
	bool io_matePTN_r(  pxwrDoc *p_doc, bool *pb_new_fmt );

	bool io_matePTV_w(  pxwrDoc *p_doc ) const;
	bool io_matePTV_r(  pxwrDoc *p_doc, bool *pb_new_fmt );

	bool io_mateOGGV_w( pxwrDoc *p_doc ) const;
	bool io_mateOGGV_r( pxwrDoc *p_doc, bool *pb_new_fmt );

	bool Tone_Ready_sample  ( const pxPulse_NoiseBuilder *ptn_bldr  );
	bool Tone_Ready_envelope( int sps );
	bool Tone_Ready         ( const pxPulse_NoiseBuilder *ptn_bldr, int sps );
};

#endif
