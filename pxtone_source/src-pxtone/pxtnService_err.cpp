// '12/03/13

#include "./pxtnService.h"

const char *pxtnService::get_last_error_text() const
{
	switch( _err )
	{
	case pxtnERR_None              : return "no error"    ;

	case pxtnERR_NoiseBuilder_Init : return "pxtone Noise Builder";
	case pxtnERR_EventList_Allocate: return "Allocate for Events" ;
	case pxtnERR_Allocate          : return "Allocating"          ;

	case pxtnERR_io_w_Version      : return "IO w Version"    ;
	case pxtnERR_io_w_ExeVersion   : return "IO w ExeVersion ";
	case pxtnERR_io_w_Dummy        : return "IO w Dummy      ";
	case pxtnERR_io_w_TagCode      : return "IO w TagCode    ";
	case pxtnERR_io_w_Master       : return "IO w Master     ";
	case pxtnERR_io_w_Events       : return "IO w Events     ";
	case pxtnERR_io_w_Name         : return "IO w Name       ";
	case pxtnERR_io_w_Comment      : return "IO w Comment    ";
	case pxtnERR_io_w_Delay        : return "IO w Delay      ";
	case pxtnERR_io_w_OverDrive    : return "IO w OverDrive  ";
	case pxtnERR_io_w_PCM          : return "IO w PCM        ";
	case pxtnERR_io_w_PTV          : return "IO w PTV        ";
	case pxtnERR_io_w_PTN          : return "IO w PTN        ";
	case pxtnERR_io_w_OGGV         : return "IO w OGGV       ";

	case pxtnERR_io_w_WoiceAssist  : return "IO w WoiceAssist";
	case pxtnERR_io_w_UnitNum      : return "IO w UnitNum    ";
	case pxtnERR_io_w_UnitAssist   : return "IO w UnitAssist ";
	case pxtnERR_io_w_EndSize      : return "IO w EndSize    ";

	case pxtnERR_io_r_TagCode      : return "IO r TagCode   ";
	case pxtnERR_io_r_AntiEdit     : return "IO r AntiEdit  ";
	case pxtnERR_io_r_UnitNum      : return "IO r UnitNum   ";
	case pxtnERR_io_r_Master       : return "IO r Master    ";
	case pxtnERR_io_r_Events       : return "IO r Events    ";
	case pxtnERR_io_r_PCM          : return "IO r PCM       ";
	case pxtnERR_io_r_PTV          : return "IO r PTV       ";
	case pxtnERR_io_r_PTN          : return "IO r PTN       ";
	case pxtnERR_io_r_OGGV         : return "IO r OGGV      ";
	case pxtnERR_io_r_Delay        : return "IO r Delay     ";
	case pxtnERR_io_r_OverDrive    : return "IO r OverDrive ";
	case pxtnERR_io_r_Title        : return "IO r Title     ";
	case pxtnERR_io_r_Coment       : return "IO r Coment    ";
	case pxtnERR_io_r_WoiceAssist  : return "IO r WoiceAssis";
	case pxtnERR_io_r_UnitAssist   : return "IO r UnitAssist";

	case pxtnERR_io_r_v4_Master    : return "IO r v4_Master ";
	case pxtnERR_io_r_v4_Event     : return "IO r v4_Event  ";
	case pxtnERR_io_r_v3_Unit      : return "IO r v3_Unit   ";
	case pxtnERR_io_r_v1_Project   : return "IO r v1_Project";
	case pxtnERR_io_r_v1_Unit      : return "IO r v1_Unit   ";
	case pxtnERR_io_r_v1_PCM       : return "IO r v1_PCM    ";
	case pxtnERR_io_r_v1_Event     : return "IO r v1_Event  ";
	case pxtnERR_io_r_Unknown      : return "IO r Unknown   ";

	case pxtnERR_io_r_Version      : return "IO r Version   ";
	case pxtnERR_io_r_VerUnknown   : return "IO r VerUnknown";
	case pxtnERR_io_r_VersionExe   : return "IO r VersionExe";
	case pxtnERR_io_r_Dummy        : return "IO r Dummy     ";

	case pxtnERR_io_r_FactSize     : return "IO r FactSize  ";
	case pxtnERR_io_r_Seek         : return "IO r Seek      ";

	case pxtnERR_io_r_BeatClock    : return "IO r BeatClock ";

	default: break;
	}
	return "unknown error";
}
