app.areas = [ 'content' ];

app.route[ '/test' ] = {
	
	content: 'HelloAltiva'
};

app.route[ '/, /test' ] = {
	
	content: 'HelloAltiva'
};