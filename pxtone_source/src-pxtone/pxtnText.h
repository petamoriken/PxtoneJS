// '12/03/03

#ifndef pxtnText_H
#define pxtnText_H

#include <pxwrDoc.h>

class pxtnText
{
private:

	char *_p_comment;
	char *_p_name   ;

public :
	pxtnText();
	~pxtnText();

	bool        set_comment( const char *p_comment );
	const char *get_comment() const;
	bool        set_name   (  const char *p_name   );
	const char *get_name   () const;


	bool Comment_r( pxwrDoc *p_doc );
	bool Comment_w( pxwrDoc *p_doc );
	bool Name_r   ( pxwrDoc *p_doc );
	bool Name_w   ( pxwrDoc *p_doc );
};

#endif
