app.areas = [ 'content' ];

app.route[ '/test' ] = {
	
	content: 'HelloAlumna'
};

app.route[ '/, /test' ] = {
	
	content: 'HelloAlumna'
};