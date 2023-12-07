const App = (function () {
/* generated by Svelte v4.2.8 */
const {
	SvelteComponent,
	check_outros,
	construct_svelte_component,
	create_component,
	destroy_component,
	detach,
	empty,
	group_outros,
	init,
	insert,
	mount_component,
	safe_not_equal,
	transition_in,
	transition_out
} = Al.lib;



function create_fragment(ctx) {
	let switch_instance0;
	let switch_instance0_anchor;
	let switch_instance1;
	let switch_instance1_anchor;
	let current;
	var switch_value = /*areas*/ ctx[0]['header'];

	function switch_props(ctx, dirty) {
		return {};
	}

	if (switch_value) {
		switch_instance0 = construct_svelte_component(switch_value, switch_props(ctx));
	}

	var switch_value_1 = /*areas*/ ctx[0]['content'];

	function switch_props_1(ctx, dirty) {
		return {};
	}

	if (switch_value_1) {
		switch_instance1 = construct_svelte_component(switch_value_1, switch_props_1(ctx));
	}

	return {
		c() {
			if (switch_instance0) create_component(switch_instance0.$$.fragment);
			switch_instance0_anchor = empty();
			if (switch_instance1) create_component(switch_instance1.$$.fragment);
			switch_instance1_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance0) mount_component(switch_instance0, target, anchor);
			insert(target, switch_instance0_anchor, anchor);
			if (switch_instance1) mount_component(switch_instance1, target, anchor);
			insert(target, switch_instance1_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*areas*/ 1 && switch_value !== (switch_value = /*areas*/ ctx[0]['header'])) {
				if (switch_instance0) {
					group_outros();
					const old_component = switch_instance0;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance0 = construct_svelte_component(switch_value, switch_props(ctx, dirty));
					create_component(switch_instance0.$$.fragment);
					transition_in(switch_instance0.$$.fragment, 1);
					mount_component(switch_instance0, switch_instance0_anchor.parentNode, switch_instance0_anchor);
				} else {
					switch_instance0 = null;
				}
			} else if (switch_value) {
				
			}

			if (dirty & /*areas*/ 1 && switch_value_1 !== (switch_value_1 = /*areas*/ ctx[0]['content'])) {
				if (switch_instance1) {
					group_outros();
					const old_component = switch_instance1;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value_1) {
					switch_instance1 = construct_svelte_component(switch_value_1, switch_props_1(ctx, dirty));
					create_component(switch_instance1.$$.fragment);
					transition_in(switch_instance1.$$.fragment, 1);
					mount_component(switch_instance1, switch_instance1_anchor.parentNode, switch_instance1_anchor);
				} else {
					switch_instance1 = null;
				}
			} else if (switch_value_1) {
				
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance0) transition_in(switch_instance0.$$.fragment, local);
			if (switch_instance1) transition_in(switch_instance1.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance0) transition_out(switch_instance0.$$.fragment, local);
			if (switch_instance1) transition_out(switch_instance1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(switch_instance0_anchor);
				detach(switch_instance1_anchor);
			}

			if (switch_instance0) destroy_component(switch_instance0, detaching);
			if (switch_instance1) destroy_component(switch_instance1, detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let areas = {};

	const show = function (updated) {
		$$invalidate(0, areas = updated);
	};

	return [areas, show];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { show: 1 });
	}

	get show() {
		return this.$$.ctx[1];
	}
}

return Component;
})();
Al.start()