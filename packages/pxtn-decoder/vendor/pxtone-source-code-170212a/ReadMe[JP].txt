/////////////////////////////////////////////////
//                                             //
// pxtone play sample (�o�[�W���� '17/01/01)   //
//                                             //
/////////////////////////////////////////////////

������͉��H��

    �s�X�g���R���[�W���i�s�X�R���j�ō�����ȃt�@�C����
    Windows �ōĐ����邾���̃T���v���\�[�X�R�[�h�ł��B

��pxtone��

    �s�X�R���ō쐬�����ȃf�[�^����"�g�`�f�[�^"����邱�Ƃ��ł���B
    ����"�g�`�f�[�^"�� wav�t�@�C���Ƃ��ĕۑ�������A�����o�b�t�@�֏o�͂��ăQ�[���Ȃǂ�
    BGM�ɂ�����ł��܂��B

    ptNoise �ō�鉹���t�@�C�����Q�[���̌��ʉ��Ƃ��ė��p���邱�Ƃ��ł��܂����A
    ���̃T���v���ł͎g�p���Ă��܂���B

���\���m����

    XAudio2   : Windows �ŉ������Đ�����̂Ɏg�p����API�B
                XAudio2 �𗘗p����ɂ� DirectX SDK ���K�v�B

    Ogg Vorbis: Xiph.org���J�������t���[�̉����t�@�C���t�H�[�}�b�g�B
                �����t�@�C���� ogg �𗘗p���Ă���Ȃ��Đ�����ɂ͂��ꂪ�K�v�B
                Xiph.org �œ���ł���B(ogg���g��Ȃ��ꍇ�͕s�v)

                Ogg Vorbis �𗘗p����ꍇ�� pxtn.h �ɂ��� "#define pxINCLUDE_OGGVORBIS 1" ��
                �R�����g�A�E�g���O���Ă��������B

���s�X�R���̋Ȃ��Đ����闬�ꁄ

    ��� pxtnService�N���X �𗘗p���܂��B

    �P�A������
      ��
    �Q�A�t�@�C���ǂݍ���
      ��
    �R�A�Đ�����
      ��
    �S�A�g�`�f�[�^�̐���
      ��
    �T�A�����o�b�t�@�֏o��

    BGM�Ƃ��čĐ�����ꍇ�́A��x�ɃT���v�����O����̂ł͂Ȃ�
    �S�E�T���J��Ԃ��ď����������o�b�t�@�֏o�͂��܂��B

�����C�Z���X�I�Ȃ��Ɓ�

    �E�Đ��ɕK�v�� �\�[�X�R�[�h(pxtone�t�H���_��)�͖����Ŏg���܂��B���ς�OK�ł��B
    �E���ɋ����Ƃ�K�v�͂���܂���B
    �E���p�̖��L�ɂ��Ă͂��C�����܂��B
    �E���p�������ŉ�����肪�������ꍇ�̐ӔC�͕������˂܂��B

��ogg/vorbis ����������_�E�����[�h���Ďg�����@��

    http://www.vorbis.com/ �� FOR DEVELOPERS �� downloads ���
    libogg-???.zip
    libvorbis-???.zip ���_�E�����[�h���ēW�J�B

    �����̃w�b�_���܂ރt�H���_���C���N���[�h�ɂ�ǉ��A
    �ȉ��̃\�[�X�R�[�h���܂߂ăr���h���܂��B
    �Elibogg\src\bitwise.c
    �Elibogg\src\framing.c
    �Elibvorbis\lib\analysis.c
    �Elibvorbis\lib\bitrate.c
    �Elibvorbis\lib\block.c
    �Elibvorbis\lib\codebook.c
    �Elibvorbis\lib\envelope.c
    �Elibvorbis\lib\floor0.c
    �Elibvorbis\lib\floor1.c
    �Elibvorbis\lib\info.c
    �Elibvorbis\lib\lookup.c
    �Elibvorbis\lib\lpc.c
    �Elibvorbis\lib\lsp.c
    �Elibvorbis\lib\mapping0.c
    �Elibvorbis\lib\mdct.c
    �Elibvorbis\lib\psy.c
    �Elibvorbis\lib\registry.c
    �Elibvorbis\lib\res0.c
    �Elibvorbis\lib\sharedbook.c
    �Elibvorbis\lib\smallft.c
    �Elibvorbis\lib\synthesis.c
    �Elibvorbis\lib\vorbisenc.c
    �Elibvorbis\lib\vorbisfile.c
    �Elibvorbis\lib\window.c
    
    �ȉ��͏��O����B
    �Elibvorbis\lib\barkmel.c
    �Elibvorbis\lib\psytune.c
    �Elibvorbis\lib\tone.c
