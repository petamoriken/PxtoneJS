#ifndef pxPulse_PCM_H
#define pxPulse_PCM_H


class pxPulse_PCM
{
private:
	int            _ch      ;
	int            _sps     ;
	int            _bps     ;
	int            _smp_head; // no use. 0
	int            _smp_body;
	int            _smp_tail; // no use. 0
	unsigned char* _p_smp   ;

	bool _Convert_ChannelNum     ( long new_ch  );
	bool _Convert_BitPerSample   ( long new_bps );
	bool _Convert_SamplePerSecond( long new_sps );

public:

	 pxPulse_PCM();
	~pxPulse_PCM();

	bool Make   ( long ch, long sps, long bps, long sample_num );
	void Release();
	bool Load   ( const char *path );
	bool Save   ( const char *path, const char* pstrLIST ) const;
	bool Convert( long  new_ch, long new_sps, long new_bps );
	bool Copy   ( pxPulse_PCM *p_dst ) const;
	bool Copy_  ( pxPulse_PCM *p_dst, long start, long end ) const;

	void *Devolve_SamplingBuffer();

	float get_sec   () const;

	int get_ch      () const;
	int get_bps     () const;
	int get_sps     () const;
	int get_smp_body() const;
	int get_smp_head() const;
	int get_smp_tail() const;

	int get_buf_size() const;

	const void *get_p_buf         () const;
	void       *get_p_buf_variable() const;

};

#endif





