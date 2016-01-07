#ifndef pxtnEvelist_H
#define pxtnEvelist_H

#include <pxwrDoc.h>

enum
{
	EVENTKIND_NULL  = 0 ,//  0

	EVENTKIND_ON        ,//  1
	EVENTKIND_KEY       ,//  2
	EVENTKIND_PAN_VOLUME,//  3
	EVENTKIND_VELOCITY  ,//  4
	EVENTKIND_VOLUME    ,//  5
	EVENTKIND_PORTAMENT ,//  6
	EVENTKIND_BEATCLOCK ,//  7
	EVENTKIND_BEATTEMPO ,//  8
	EVENTKIND_BEATNUM   ,//  9
	EVENTKIND_REPEAT    ,// 10
	EVENTKIND_LAST      ,// 11
	EVENTKIND_VOICENO   ,// 12
	EVENTKIND_GROUPNO   ,// 13
	EVENTKIND_CORRECT   ,// 14
	EVENTKIND_PAN_TIME  ,// 15

	EVENTKIND_NUM       ,// 16
};

#define EVENTDEFAULT_VOLUME       104
#define EVENTDEFAULT_VELOCITY     104
#define EVENTDEFAULT_PAN_VOLUME    64
#define EVENTDEFAULT_PAN_TIME      64
#define EVENTDEFAULT_PORTAMENT      0
#define EVENTDEFAULT_VOICENO        0
#define EVENTDEFAULT_GROUPNO        0
#define EVENTDEFAULT_KEY       0x6000
#define EVENTDEFAULT_BASICKEY  0x4500 // 4A(440Hz?)
#define EVENTDEFAULT_CORRECT     1.0f

#define EVENTDEFAULT_BEATNUM        4
#define EVENTDEFAULT_BEATTEMPO    120
#define EVENTDEFAULT_BEATCLOCK    480

typedef struct EVERECORD
{
	unsigned char  kind    ;
	unsigned char  unit_no ;
	unsigned char  reserve1;
	unsigned char  reserve2;
	long           value   ;
	long           clock   ;
	EVERECORD*     prev    ;
	EVERECORD*     next    ;
}
EVERECORD;

//--------------------------------

class pxtnEvelist
{

private:

	long       _max_num;
	EVERECORD* _recs   ;
	EVERECORD* _start  ;
	long       _linear ;

	EVERECORD* _p_x4x_rec;

	pxtnEvelist(              const pxtnEvelist &src  ){               } // copy
	pxtnEvelist & operator = (const pxtnEvelist &right){ return *this; } // substitution

	void _SetRecord( EVERECORD* p_rec, EVERECORD* prev, EVERECORD* next, long clock, unsigned char unit_no, unsigned char kind, long value );
	void _CutRecord( EVERECORD* p_rec );

public:

	void Release();
	void Clear  ();

	 pxtnEvelist();
	~pxtnEvelist();

	bool Allocate( int max_num );

	int  get_Num_Max  () const;
	int  get_Max_Clock() const;
	int  get_Count(    ) const;
	int  get_Count(                                                    unsigned char kind, long value ) const;
	int  get_Count(                             unsigned char unit_no                                 ) const;
	int  get_Count(                             unsigned char unit_no, unsigned char kind             ) const;
	int  get_Count(   long clock1, long clock2, unsigned char unit_no                                 ) const;
	long get_Value(   long clock ,              unsigned char unit_no, unsigned char kind             ) const;

	const EVERECORD* get_Records( void ) const;

	bool Record_Add_i( long clock,               unsigned char unit_no, unsigned char kind, long  value   );
	bool Record_Add_f( long clock,               unsigned char unit_no, unsigned char kind, float value_f );

	bool Linear_Start( void );
	void Linear_Add_i( long clock,                       unsigned char unit_no, unsigned char kind, long  value   );
	void Linear_Add_f( long clock,                       unsigned char unit_no, unsigned char kind, float value_f );
	void Linear_End(           bool b_connect );

	int  Record_Clock_Shift(   long clock,  long shift , unsigned char unit_no  ); // can't be under 0.
	int  Record_Value_Set(     long clock1, long clock2, unsigned char unit_no, unsigned char kind, long value );
	int  Record_Value_Change(  long clock1, long clock2, unsigned char unit_no, unsigned char kind, long value );
	int  Record_Value_Omit(                                                     unsigned char kind, long value );
	int  Record_Value_Replace(                                                  unsigned char kind, long old_value, long new_value ); 
	int  Record_Delete(        long clock1, long clock2, unsigned char unit_no, unsigned char kind             );
	int  Record_Delete(        long clock1, long clock2, unsigned char unit_no                                 );

	int  Record_UnitNo_Miss(                             unsigned char unit_no                                 ); // delete event has the unit-no
	int  Record_UnitNo_Set(                              unsigned char unit_no                                 ); // set the unit-no
	int  Record_UnitNo_Replace(                          unsigned char old_u, unsigned char new_u              ); // exchange unit


	bool io_Write( pxwrDoc *p_doc, long rough       ) const;
	bool io_Read ( pxwrDoc *p_doc, bool *pb_new_fmt ); 
	long io_Read_EventNum( pxwrDoc *p_doc ) const;


	bool x4x_Read_Start(   void );
	void x4x_Read_NewKind( void );
	void x4x_Read_Add(     long clock, unsigned char unit_no, unsigned char kind, long value );

	bool io_Unit_Read_x4x_EVENT( pxwrDoc *p_doc, bool bTailAbsolute, bool bCheckRRR, bool *pb_new_fmt );
	long io_Read_x4x_EventNum( pxwrDoc *p_doc ) const;

};

bool Evelist_Kind_IsTail( long kind );

#endif
