#ifndef pxTypedef_H
#define pxTypedef_H

#ifndef SAFE_DELETE
#define SAFE_DELETE(p){ if (p) { delete (p); (p)=NULL; } }
#endif

typedef	unsigned char   u8 ;
typedef	signed char     s8 ;
typedef	unsigned short  u16;
typedef	signed short    s16;
typedef	unsigned int    u32;
typedef	signed int      s32;

typedef	float           f32;
typedef double          f64;

typedef struct
{
	f32 l;
	f32 t;
	f32 r;
	f32 b;
}
fRECT;

typedef struct
{
	s32 l;
	s32 t;
	s32 r;
	s32 b;
}
sRECT;

typedef struct
{
	f32 x;
	f32 y;
}
fPOINT;

typedef struct pxPOINT
{
    s32  x;
    s32  y;
}
s32POINT;

#endif
