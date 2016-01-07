#include <stdio.h>
#include <math.h>

#include "./pxPulse_Oscillator.h"

pxPulse_Oscillator::pxPulse_Oscillator()
{
	_volume      =    0;
	_p_point     = NULL;
	_sample_num  =    0;
	_point_num   =    0;
	_point_reso  =    0;
}

void pxPulse_Oscillator::ReadyGetSample( s32POINT *p_point, long point_num, long volume, long sample_num, long point_reso )
{
	_volume      = volume;
	_p_point     = p_point;
	_sample_num  = sample_num;
	_point_num   = point_num;
	_point_reso  = point_reso;
}

double pxPulse_Oscillator::GetOneSample_Overtone( long index )
{
	long   o;
	double work_double;
	double pi = 3.1415926535897932;
	double sss;

	work_double = 0;
	for( o = 0; o < _point_num; o++ )
	{
		sss          = 2 * pi * ( _p_point[ o ].x ) * index / _sample_num;
		work_double += ( sin( sss ) * (double)_p_point[ o ].y / ( _p_point[ o ].x ) / 128 );
	}
	work_double = work_double * _volume / 128;

	return work_double;
}

double pxPulse_Oscillator::GetOneSample_Coodinate( long index )
{
	long i;
	long c;
	long x1, y1, x2, y2;
	long w, h;
	double work;
	
	i = _point_reso * index / _sample_num;

	// ‘ÎÛ‚Ì‚Qƒ|ƒCƒ“ƒg‚ð’T‚·
	c = 0;
	while( c < _point_num )
	{
		if( _p_point[ c ].x > i ) break;
		c++;
	}

	//––’[
	if( c == _point_num )
	{
		x1 = _p_point[ c - 1 ].x;
		y1 = _p_point[ c - 1 ].y;
		x2 = _point_reso;
		y2 = _p_point[   0   ].y;
	}
	else
	{
		if( c ){
			x1 = _p_point[ c - 1 ].x;
			y1 = _p_point[ c - 1 ].y;
			x2 = _p_point[   c   ].x;
			y2 = _p_point[   c   ].y;
		}else{
			x1 = _p_point[   0   ].x;
			y1 = _p_point[   0   ].y;
			x2 = _p_point[   0   ].x;
			y2 = _p_point[   0   ].y;
		}
	}

	w = x2 - x1;
	i =  i - x1;
	h = y2 - y1;

	if( i ) work = (double)y1 + (double)h * (double)i / (double)w;
	else    work = y1;

	return work * _volume / 128 /128 ;

}