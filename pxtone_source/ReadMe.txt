�d�l�����i��������Ɓj

src-oggvorbis :
	oggvorbis �̃\�[�X�ł��B

src-pxtone    :
	pxtone �{�̂̃\�[�X�ł��B

src-pxtonePlay:
	�s�X�g���R���[�W���̃f�[�^����������ɂ́A
	��ɂ����ɂ��� pxtoneVomit�N���X���g���܂��B
	pxtoneVomit�N���X��Read()�ŋȃt�@�C����ǂݍ��݁A
	vomit()�ŃT���v�����O�f�[�^�̐������s���܂��B
	�����ł����T���v�����O�f�[�^���e�v���b�g�t�H�[���̃o�b�t�@�ɗ�������ł��������B

	�e���\�b�h�̖���(���������)

		bool Init (); ���������܂�
		bool Read (); �f�[�^��ǂݍ��݂܂��B
		bool Clear(); �ǂݍ��񂾓��e���N���A���܂��B
		bool Start(); �J�n�ʒu(�T���v�����O�P��) �ƃt�F�[�h�C�����Ԃ��w�肵�ăf�[�^�̐����̏��������܂��B

		bool set_quality (); ������ݒ肵�܂��B
		bool set_loop    (); ���[�v�̗L����ݒ肵�܂��B
		bool set_volume  (); �{�����[����ݒ肵�܂��B
		int  set_fade    (); �t�F�[�h�A�E�g�̐ݒ���s���܂��B

		bool is_vomiting() const; �o�b�t�@��f���o�����Ԃ��ǂ���

		const char *get_title     () const; �Ȃ̃^�C�g�����擾
		const char *get_comment   () const; �Ȃ̃R�����g���擾
		const char *get_last_error() const; �ŏI�G���[���擾

		bool get_info() const; �Ȃ̏����擾
		int  get_meas_repeat() const; 
		int  get_meas_play  () const;

		bool vomit( void *p_buf, int buf_size ); ���������o�b�t�@�ɃT���v�����O�f�[�^��f���o���܂��B

src-pxwr      :
	pxtoneVomit �ł��g�p���Ă���A�Ǝ��̃t�@�C��(���\�[�X)�ǂݍ��ݗp�N���X�ł��B
	�����ŌĂ΂�Ă��� pxwFile_...Open() �́A�t�@�C���̓��e���������ɒu���āA
	���̃|�C���^�[��Ԃ����̂ł��B
