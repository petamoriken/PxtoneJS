仕様説明（ざっくりと）

src-oggvorbis :
	oggvorbis のソースです。

src-pxtone    :
	pxtone 本体のソースです。

src-pxtonePlay:
	ピストンコラージュのデータを処理するには、
	主にここにある pxtoneVomitクラスを使います。
	pxtoneVomitクラスはRead()で曲ファイルを読み込み、
	vomit()でサンプリングデータの生成を行います。
	生成できたサンプリングデータを各プラットフォームのバッファに流し込んでください。

	各メソッドの役割(ざっくりと)

		bool Init (); 初期化します
		bool Read (); データを読み込みます。
		bool Clear(); 読み込んだ内容をクリアします。
		bool Start(); 開始位置(サンプリング単位) とフェードイン時間を指定してデータの生成の準備をします。

		bool set_quality (); 音質を設定します。
		bool set_loop    (); ループの有無を設定します。
		bool set_volume  (); ボリュームを設定します。
		int  set_fade    (); フェードアウトの設定を行います。

		bool is_vomiting() const; バッファを吐き出せる状態かどうか

		const char *get_title     () const; 曲のタイトルを取得
		const char *get_comment   () const; 曲のコメントを取得
		const char *get_last_error() const; 最終エラーを取得

		bool get_info() const; 曲の情報を取得
		int  get_meas_repeat() const; 
		int  get_meas_play  () const;

		bool vomit( void *p_buf, int buf_size ); したい下バッファにサンプリングデータを吐き出します。

src-pxwr      :
	pxtoneVomit でも使用している、独自のファイル(リソース)読み込み用クラスです。
	ここで呼ばれている pxwFile_...Open() は、ファイルの内容をメモリに置いて、
	そのポインターを返すものです。
