export default async function middleware (ctx, proceed, redirect) {
	const calls = window.__mw_calls || (window.__mw_calls = []);
	calls.push({
		current: ctx.current.path,
		next: ctx.next.path,
		next_params: { ...ctx.next.params }
	});
	ctx.next.path = 'mutated';
	if (window.__mw_redirect) {
		const to = window.__mw_redirect;
		window.__mw_redirect = null;
		return redirect(to);
	}
	if (window.__mw_redirect_then_proceed) {
		window.__mw_redirect_then_proceed = false;
		redirect('/about');
		await proceed();
		return;
	}
	if (window.__mw_block)
		return;
	await proceed();
}
