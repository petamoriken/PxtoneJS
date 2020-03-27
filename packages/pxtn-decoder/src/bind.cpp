#include <stdlib.h>
#include <string.h>

#include <emscripten/bind.h>

#include <pxtnDescriptor.h>

#include <pxtoneNoise.h>
#include <pxtnService.h>

using namespace emscripten;

// Pxtone Noise
bool decode_noise(uintptr_t noise_c, int noise_length, int ch, int sps, int bps,
                  uintptr_t wave_c, uintptr_t wave_length_c)
{
  void *noise = (void *)noise_c;
  void **wave = (void **)wave_c;
  int *wave_length = (int *)wave_length_c;

  bool b_ret = false;
  pxtnDescriptor *doc = new pxtnDescriptor();
  pxtoneNoise *pxNoise = new pxtoneNoise();

  void **buffer;

  // set buffer to doc
  if (!doc->set_memory_r(noise, noise_length))
  {
    goto End;
  }

  // create noise
  if (!pxNoise->init())
  {
    goto End;
  }
  if (!pxNoise->quality_set(ch, sps, bps))
  {
    goto End;
  }

  // set doc to noise
  if (!pxNoise->generate(doc, buffer, wave_length))
  {
    goto End;
  }

  // memcpy
  *wave = malloc(*wave_length);
  memcpy(*wave, *buffer, *wave_length);

  b_ret = true;

End:
  if (pxNoise)
  {
    delete pxNoise;
  }
  if (doc)
  {
    delete doc;
  }
  if (*wave && !b_ret)
  {
    free(*wave);
  }

  return b_ret;
}

// new pxtone version only supports a fixed bps
pxtnERR check_bps(int bps)
{
  if (bps != pxtnBITPERSAMPLE)
  {
    return pxtnERR_INIT;
  }
  return pxtnOK;
}

// Pxtone Project
bool create_pxtone(uintptr_t pxtn_c, int pxtn_length, int ch, int sps, int bps,
                   uintptr_t pxtn_service_c, uintptr_t doc_c)
{

  void *pxtn = (void *)pxtn_c;

  void **pxtn_service_m = (void **)pxtn_service_c;
  void **doc_m = (void **)doc_c;

  bool b_ret = false;

  pxtnDescriptor *doc = new pxtnDescriptor();
  pxtnService *pxtn_service = new pxtnService();

  // set buffer to doc
  pxtnERR pxtn_err = pxtnERR_VOID;
  if (!doc->set_memory_r(pxtn, pxtn_length))
  {
    goto End;
  }

  // create vomit
  pxtn_err = pxtn_service->init();
  if (pxtn_err != pxtnOK)
  {
    goto End;
  }
  if (!pxtn_service->set_destination_quality(ch, sps))
  {
    goto End;
  }
  pxtn_err = check_bps(bps);
  if (pxtn_err != pxtnOK)
  {
    goto End;
  }

  // set doc to vomit
  pxtn_err = pxtn_service->read(doc);
  if (pxtn_err != pxtnOK)
  {
    goto End;
  }
  pxtn_err = pxtn_service->tones_ready();
  if (pxtn_err != pxtnOK)
  {
    goto End;
  }

  *pxtn_service_m = (void *)pxtn_service;
  *doc_m = (void *)doc;

  b_ret = true;

End:
  if (!b_ret)
  {
    delete pxtn_service;
    delete doc;
  }

  return b_ret;
}

void release_pxtone(uintptr_t pxtn_service_c, uintptr_t doc_c)
{

  void **pxtn_service_m = (void **)pxtn_service_c;
  void **doc_m = (void **)doc_c;

  pxtnService *pxtn_service = (pxtnService *)*pxtn_service_m;
  pxtnDescriptor *doc = (pxtnDescriptor *)*doc_m;

  if (pxtn_service)
  {
    delete pxtn_service;
  }
  if (doc)
  {
    delete doc;
  }
}

bool get_pxtone_text(uintptr_t pxtn_service_c,
                     uintptr_t title_c, uintptr_t title_length_c,
                     uintptr_t comment_c, uintptr_t comment_length_c)
{

  void **pxtn_service_m = (void **)pxtn_service_c;

  void **title = (void **)title_c;
  int *title_length = (int *)title_length_c;
  void **comment = (void **)comment_c;
  int *comment_length = (int *)comment_length_c;

  pxtnService *pxtn_service = (pxtnService *)*pxtn_service_m;

  // title, comment
  *title = (void *)pxtn_service->text->get_name_buf(title_length);
  *comment = (void *)pxtn_service->text->get_comment_buf(comment_length);

  return true;
}

bool get_pxtone_info(uintptr_t pxtn_service_c, int ch, int sps, int bps,
                     uintptr_t wave_length_c,
                     uintptr_t loopStart_c, uintptr_t loopEnd_c)
{

  void **pxtn_service_m = (void **)pxtn_service_c;

  int *wave_length = (int *)wave_length_c;
  double *loopStart = (double *)loopStart_c;
  double *loopEnd = (double *)loopEnd_c;

  bool b_ret = false;

  pxtnService *pxtn_service = (pxtnService *)*pxtn_service_m;

  int beatNum;
  float beatTempo;
  int measNum;
  int sampleNum;
  double duration;

  pxtn_service->master->Get(&beatNum, &beatTempo, NULL, &measNum);
  if (check_bps(bps) != pxtnOK)
  {
    goto End;
  }

  sampleNum = pxtnService_moo_CalcSampleNum(measNum, beatNum, sps, beatTempo) * ch * bps / 8;

  // length
  *wave_length = sampleNum;

  // loop
  duration = (double)sampleNum / (double)ch / ((double)bps / 8) / (double)sps;
  *loopStart = (double)pxtn_service->master->get_repeat_meas() / (double)measNum * duration;
  *loopEnd = (double)pxtn_service->master->get_play_meas() / (double)measNum * duration;

  b_ret = true;

End:
  return b_ret;
}

// getPxtoneMaster and getPxtoneInfo get a lot of the same data, but getPxtonInfo gets
// durations for audio playback, and getPxtoneMaster gets counts for drawing calculations.
bool get_pxtone_master(uintptr_t pxServ_c,
                       uintptr_t beatNum, uintptr_t beatTempo, uintptr_t beatClock, uintptr_t measNum,
                       uintptr_t repeatMeas, uintptr_t lastMeas)
{
  void **pxServ_m = (void **)pxServ_c;
  pxtnService *pxtn = (pxtnService *)*pxServ_m;

  pxtn->master->Get((int *)beatNum, (float *)beatTempo, (int *)beatClock, (int *)measNum);

  *((int *)repeatMeas) = pxtn->master->get_repeat_meas();
  *((int *)lastMeas) = pxtn->master->get_last_meas();

  return true;
}

bool get_pxtone_units(uintptr_t pxServ_c, uintptr_t unitNum_c,
                      uintptr_t names_c, uintptr_t sizes_c)
{
  void **pxServ_m = (void **)pxServ_c;
  pxtnService *pxtn = (pxtnService *)*pxServ_m;

  int32_t *unitNum = (int *)unitNum_c;
  int32_t **sizes = (int **)sizes_c;
  const char ***names = (const char ***)names_c;

  *unitNum = pxtn->Unit_Num();

  *sizes = (int *)malloc(*unitNum * sizeof(int));
  *names = (const char **)malloc(*unitNum * sizeof(char *));
  for (int i = 0; i < *unitNum; ++i)
  {
    (*names)[i] = pxtn->Unit_Get(i)->get_name_buf((*sizes) + i);
    // sizes from get_name_buf are upper bounds. js postprocessing does not
    // detect null character so we do it here
    if ((*sizes)[i] > strlen((*names)[i]))
    {
      (*sizes)[i] = strlen((*names)[i]);
    }
  }
  return true;
}

bool set_pxtone_unit_mute(uintptr_t pxServ_c, int unitNum, bool isMute)
{
  void **pxServ_m = (void **)pxServ_c;
  pxtnService *pxtn = (pxtnService *)*pxServ_m;

  pxtnUnit *unit = pxtn->Unit_Get_variable(unitNum);
  if (unit == nullptr)
  {
    return false;
  }

  unit->set_played(!isMute);
  return true;
}

bool get_pxtone_unit_mute(uintptr_t pxServ_c, int unitNum, uintptr_t isMute_c)
{
  void **pxServ_m = (void **)pxServ_c;
  pxtnService *pxtn = (pxtnService *)*pxServ_m;

  bool *isMute = (bool *)isMute_c;

  const pxtnUnit *unit = pxtn->Unit_Get(unitNum);
  if (unit == nullptr)
  {
    return false;
  }

  *isMute = !unit->get_played();
  return true;
}

bool get_pxtone_evels(uintptr_t pxServ_c, uintptr_t evelNum_c,
                      uintptr_t kinds_c, uintptr_t units_c, uintptr_t values_c, uintptr_t clocks_c)
{
  void **pxServ_m = (void **)pxServ_c;
  pxtnService *pxtn = (pxtnService *)*pxServ_m;

  int *evelNum = (int *)evelNum_c;

  uint8_t **kinds = (uint8_t **)kinds_c;
  uint8_t **units = (uint8_t **)units_c;
  int32_t **values = (int32_t **)values_c;
  int32_t **clocks = (int32_t **)clocks_c;

  *evelNum = pxtn->evels->get_Count();
  *kinds = (uint8_t *)malloc(*evelNum * sizeof(uint8_t));
  *units = (uint8_t *)malloc(*evelNum * sizeof(uint8_t));
  *values = (int32_t *)malloc(*evelNum * sizeof(int32_t));
  *clocks = (int32_t *)malloc(*evelNum * sizeof(int32_t));

  int i = 0;
  for (const EVERECORD *p = pxtn->evels->get_Records(); p; p = p->next, ++i)
  {
    (*kinds)[i] = p->kind;
    (*units)[i] = p->unit_no;
    (*values)[i] = p->value;
    (*clocks)[i] = p->clock;
  }

  return true;
}

int32_t sample_at(const pxtnService *const pxtn_service, int32_t meas_num)
{
  int32_t beat_num = pxtn_service->master->get_beat_num();
  int32_t p_ch_num, sps;
  pxtn_service->get_destination_quality(&p_ch_num, &sps);
  float beat_tempo = pxtn_service->master->get_beat_tempo();
  return pxtnService_moo_CalcSampleNum(meas_num, beat_num, sps, beat_tempo);
}

bool prepare_vomit_pxtone(uintptr_t pxtn_service_c, int start_pos)
{
  void **pxtn_service_m = (void **)pxtn_service_c;
  pxtnService *pxtn_service = (pxtnService *)*pxtn_service_m;

  pxtnVOMITPREPARATION prep = {0};
  prep.flags |= pxtnVOMITPREPFLAG_loop;
  prep.flags |= pxtnVOMITPREPFLAG_unit_mute;

  // seeking to a position past the end doesn't wrap, so we have to do it
  // ourselves. (the repeat sample position is missing in particular)
  {
    prep.start_pos_sample = start_pos;
    int32_t end_smp = pxtn_service->moo_get_total_sample();
    int32_t rep_smp = sample_at(pxtn_service, pxtn_service->master->get_repeat_meas());
    while (prep.start_pos_sample > end_smp)
    {
      prep.start_pos_sample -= end_smp - rep_smp;
    }
  }

  prep.master_volume = 1.f;
  return pxtn_service->moo_preparation(&prep);
}

bool vomit_pxtone(uintptr_t pxtn_service_c, uintptr_t buffer_c, int size)
{

  void **pxtn_service_m = (void **)pxtn_service_c;
  void *buffer = (void *)buffer_c;

  pxtnService *pxtn_service = (pxtnService *)*pxtn_service_m;

  bool b_ret = false;

  if (!pxtn_service->Moo(buffer, size))
  {
    goto End;
  }

  b_ret = true;
End:
  return b_ret;
}

EMSCRIPTEN_BINDINGS(pxtn_module)
{
  function("decodeNoise", &decode_noise);
  function("createPxtone", &create_pxtone);
  function("releasePxtone", &release_pxtone);
  function("getPxtoneText", &get_pxtone_text);
  function("getPxtoneInfo", &get_pxtone_info);
  function("getPxtoneMaster", &get_pxtone_master);
  function("getPxtoneUnitMute", &get_pxtone_unit_mute);
  function("getPxtoneUnits", &get_pxtone_units);
  function("getPxtoneEvels", &get_pxtone_evels);
  function("prepareVomitPxtone", &prepare_vomit_pxtone);
  function("setPxtoneUnitMute", &set_pxtone_unit_mute);
  function("vomitPxtone", &vomit_pxtone);
}