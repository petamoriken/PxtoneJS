#include <stdlib.h>
#include <string.h>

#include <emscripten/bind.h>

#include <pxwrDoc.h>

#include <pxtoneNoise.h>
#include <pxtoneVomit.h>

using namespace emscripten;

// Pxtone Noise
bool decodeNoise(uintptr_t noise_c, int noise_length, int ch, int sps, int bps, uintptr_t wave_c, uintptr_t wave_length_c) {

	void *		noise 		= (void *) noise_c;
	void **		wave		= (void **) wave_c; 
	int *		wave_length	= (int *) wave_length_c;

	bool			b_ret	= false;
	pxwrDoc *		doc		= new pxwrDoc();
	pxtoneNoise *	pxNoise	= new pxtoneNoise();

	void **		buffer;

	// set buffer to doc
	if(!doc->SetRead(noise, noise_length))			goto End;

	// create noise
	if(!pxNoise->Init())							goto End;
	if(!pxNoise->SetQuality(ch, sps, bps))			goto End;

	// set doc to noise
	if(!pxNoise->Sample(doc, buffer, wave_length))	goto End;

	// memcpy
	*wave = malloc(*wave_length);
	memcpy(*wave, *buffer, *wave_length);

	b_ret = true;

End:
	if(pxNoise)			delete pxNoise;
	if(doc)				delete doc;
	if(*wave && !b_ret)	free(*wave);

	return b_ret;
}

// Pxtone Project
bool decodePxtone(uintptr_t pxtn_c, int pxtn_length, int ch, int sps, int bps, uintptr_t wave_c, uintptr_t wave_length_c, uintptr_t loopStart_c, uintptr_t loopEnd_c, uintptr_t title_c, uintptr_t title_length_c, uintptr_t comment_c, uintptr_t comment_length_c) {

	void *		pxtn		= (void *) pxtn_c;
	void **		wave		= (void **) wave_c; 
	int *		wave_length	= (int *) wave_length_c;

	double *	loopStart	= (double *) loopStart_c;
	double *	loopEnd		= (double *) loopEnd_c;

	void **		title			= (void **) title_c;
	int *		title_length	= (int *) title_length_c;
	void **		comment			= (void **) comment_c;
	int *		comment_length	= (int *) comment_length_c;


	bool			b_ret	= false;
	pxwrDoc *		doc		= new pxwrDoc();
	pxtoneVomit *	pxVomit	= new pxtoneVomit();

	int			beatNum;
	float		beatTempo;
	int			measNum;
	int			sampleNum;
	double		duration;

	char		buffer[4096];
	int			size, pc;

	const char *	titleBuffer;
	const char *	commentBuffer;

	// set buffer to doc
	if(!doc->SetRead(pxtn, pxtn_length))	goto End;

	// create vomit
	if(!pxVomit->Init())					goto End;
	if(!pxVomit->set_quality(ch, sps, bps))	goto End;

	// set doc to vomit
	if(!pxVomit->Read(doc))					goto End;
	pxVomit->get_info(&beatNum, &beatTempo, NULL, &measNum);
	sampleNum = pxtoneVomit_Calc_sample_num(measNum, beatNum, sps, beatTempo) * ch * bps / 8;

	// vomit!!
	*wave = malloc(sampleNum);
	if(!pxVomit->Start(0, 0))				goto End;
	pc = 0;
	do {
		size = (sampleNum - pc < sizeof(buffer)) ? (sampleNum - pc) : sizeof(buffer);
		if(!pxVomit->vomit(buffer, size))	goto End;
		memcpy((char *)*wave + pc, buffer, size);
		pc += size;
	} while(pc < sampleNum);
	*wave_length = sampleNum;

	// loop
	duration = (double)sampleNum / (double)ch / ((double)bps / 8) / (double)sps;
	*loopStart = (double)pxVomit->get_meas_repeat() / (double)measNum * duration;
	*loopEnd = (double)pxVomit->get_meas_play() / (double)measNum * duration;

	// title, comment
	titleBuffer = pxVomit->get_title();
	*title_length = strlen(titleBuffer);
	*title = malloc(*title_length);
	memcpy(*title, titleBuffer, *title_length);

	commentBuffer = pxVomit->get_comment();
	*comment_length = strlen(commentBuffer);
	*comment = malloc(*comment_length);
	memcpy(*comment, commentBuffer, *comment_length);

	b_ret = true;

End:
	if(pxVomit)			delete pxVomit;
	if(doc)				delete doc;
	if(*wave && !b_ret)	free(*wave);

	return b_ret;
}

EMSCRIPTEN_BINDINGS(px_module) {
	function("decodeNoise", &decodeNoise);
	function("decodePxtone", &decodePxtone);
}