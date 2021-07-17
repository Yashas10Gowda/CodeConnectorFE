
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.38.3 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

    // (251:0) {:else}
    function create_else_block$5(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$5.name,
    		type: "else",
    		source: "(251:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (244:0) {#if componentParams}
    function create_if_block$9(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(244:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$9, create_else_block$5];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn("Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading");

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    	try {
    		const newState = { ...history.state };
    		delete newState["__svelte_spa_router_scrollX"];
    		delete newState["__svelte_spa_router_scrollY"];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event("hashchange"));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute("href");

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == "/") {
    		// Add # to the href attribute
    		href = "#" + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != "#/") {
    		throw Error("Invalid value for \"href\" attribute: " + href);
    	}

    	node.setAttribute("href", href);

    	node.addEventListener("click", event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute("href"));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == "string") {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument - strings must start with / or *");
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == "string") {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || "/";
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || "/";
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || "") || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.__svelte_spa_router_scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener("popstate", popStateChanged);

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.__svelte_spa_router_scrollX, previousScrollState.__svelte_spa_router_scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == "object" && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick("conditionsFailed", detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoading", Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick("routeLoaded", Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == "object" && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick("routeLoaded", Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener("popstate", popStateChanged);
    	});

    	const writable_props = ["routes", "prefix", "restoreScrollState"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(3, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ("restoreScrollState" in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("props" in $$props) $$invalidate(2, props = $$props.props);
    		if ("previousScrollState" in $$props) previousScrollState = $$props.previousScrollState;
    		if ("popStateChanged" in $$props) popStateChanged = $$props.popStateChanged;
    		if ("lastLoc" in $$props) lastLoc = $$props.lastLoc;
    		if ("componentObj" in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? "manual" : "auto";
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Nav.svelte generated by Svelte v3.38.3 */
    const file$9 = "src/Nav.svelte";

    // (49:2) {:else}
    function create_else_block$4(ctx) {
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let a1;
    	let t3;
    	let li2;
    	let a2;
    	let t5;
    	let li3;
    	let a3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Yashas";
    			t1 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Developers";
    			t3 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Register";
    			t5 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Login";
    			attr_dev(a0, "class", "nav-link svelte-jhnr86");
    			attr_dev(a0, "rel", "noopener");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "href", "https://yashasgowda.web.app/");
    			add_location(a0, file$9, 51, 5, 1293);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$9, 50, 4, 1266);
    			attr_dev(a1, "class", "nav-link svelte-jhnr86");
    			attr_dev(a1, "href", "/developers");
    			add_location(a1, file$9, 61, 5, 1475);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$9, 60, 4, 1448);
    			attr_dev(a2, "class", "nav-link svelte-jhnr86");
    			attr_dev(a2, "href", "/register");
    			add_location(a2, file$9, 66, 5, 1592);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$9, 65, 4, 1565);
    			attr_dev(a3, "class", "nav-link svelte-jhnr86");
    			attr_dev(a3, "href", "/login");
    			add_location(a3, file$9, 69, 5, 1692);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file$9, 68, 4, 1665);
    			attr_dev(ul, "class", "navbar-nav svelte-jhnr86");
    			add_location(ul, file$9, 49, 3, 1238);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(ul, t5);
    			append_dev(ul, li3);
    			append_dev(li3, a3);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a1)),
    					action_destroyer(link.call(null, a2)),
    					action_destroyer(link.call(null, a3))
    				];

    				mounted = true;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(49:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (32:2) {#if username != null}
    function create_if_block$8(ctx) {
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let a1;
    	let t3;
    	let li2;
    	let a2;
    	let t5;
    	let li3;
    	let a3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Developers";
    			t1 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Posts";
    			t3 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Dashboard";
    			t5 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Logout";
    			attr_dev(a0, "class", "nav-link svelte-jhnr86");
    			attr_dev(a0, "href", "/developers");
    			add_location(a0, file$9, 34, 5, 847);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$9, 33, 4, 820);
    			attr_dev(a1, "class", "nav-link svelte-jhnr86");
    			attr_dev(a1, "href", "/posts");
    			add_location(a1, file$9, 39, 5, 964);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$9, 38, 4, 937);
    			attr_dev(a2, "class", "nav-link svelte-jhnr86");
    			attr_dev(a2, "href", "/");
    			add_location(a2, file$9, 42, 5, 1058);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$9, 41, 4, 1031);
    			attr_dev(a3, "class", "nav-link svelte-jhnr86");
    			attr_dev(a3, "href", "/logout");
    			add_location(a3, file$9, 45, 5, 1151);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file$9, 44, 4, 1124);
    			attr_dev(ul, "class", "navbar-nav svelte-jhnr86");
    			add_location(ul, file$9, 32, 3, 792);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(ul, t5);
    			append_dev(ul, li3);
    			append_dev(li3, a3);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a0)),
    					action_destroyer(link.call(null, a1)),
    					action_destroyer(link.call(null, a2)),
    					action_destroyer(link.call(null, a3))
    				];

    				mounted = true;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(32:2) {#if username != null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let nav;
    	let a;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let button;
    	let span;
    	let t2;
    	let div;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*username*/ ctx[0] != null) return create_if_block$8;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			a = element("a");
    			img = element("img");
    			t0 = text("\n\t\t CodeConnector");
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			t2 = space();
    			div = element("div");
    			if_block.c();
    			attr_dev(img, "class", "code-icon svelte-jhnr86");
    			if (img.src !== (img_src_value = "https://yashas.pythonanywhere.com/static/img/code-solid.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Code");
    			add_location(img, file$9, 12, 2, 327);
    			attr_dev(a, "class", "navbar-brand svelte-jhnr86");
    			attr_dev(a, "href", "/");
    			add_location(a, file$9, 11, 1, 282);
    			attr_dev(span, "class", "navbar-toggler-icon");
    			add_location(span, file$9, 28, 2, 661);
    			attr_dev(button, "class", "navbar-toggler");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "data-toggle", "collapse");
    			attr_dev(button, "data-target", "#navbarNav");
    			attr_dev(button, "aria-controls", "navbarNav");
    			attr_dev(button, "aria-expanded", "false");
    			attr_dev(button, "aria-label", "Toggle navigation");
    			add_location(button, file$9, 19, 1, 470);
    			attr_dev(div, "class", "collapse navbar-collapse");
    			attr_dev(div, "id", "navbarNav");
    			add_location(div, file$9, 30, 1, 710);
    			attr_dev(nav, "class", "navbar sticky-top navbar-expand-lg navbar-dark bg-dark py-1 svelte-jhnr86");
    			add_location(nav, file$9, 10, 0, 207);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, a);
    			append_dev(a, img);
    			append_dev(a, t0);
    			append_dev(nav, t1);
    			append_dev(nav, button);
    			append_dev(button, span);
    			append_dev(nav, t2);
    			append_dev(nav, div);
    			if_block.m(div, null);

    			if (!mounted) {
    				dispose = action_destroyer(link.call(null, a));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Nav", slots, []);
    	let username = null;

    	onMount(() => {
    		$$invalidate(0, username = window.localStorage.getItem("username:authtoken"));
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, link, username });

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [username];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/Index.svelte generated by Svelte v3.38.3 */
    const file$8 = "src/Index.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (142:2) {:else}
    function create_else_block_2(ctx) {
    	document.title = "Welcome " + /*username*/ ctx[0].toUpperCase();
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(142:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (140:2) {#if username == null}
    function create_if_block_2$5(ctx) {
    	const block = {
    		c: function create() {
    			document.title = "Welcome to CodeConnector";
    		},
    		m: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$5.name,
    		type: "if",
    		source: "(140:2) {#if username == null}",
    		ctx
    	});

    	return block;
    }

    // (164:0) {:else}
    function create_else_block$3(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let t3_value = /*username*/ ctx[0].toUpperCase() + "";
    	let t3;
    	let t4;
    	let t5;
    	let div3;

    	function select_block_type_2(ctx, dirty) {
    		if (/*userid*/ ctx[1]) return create_if_block_1$6;
    		return create_else_block_1$1;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Dashboard";
    			t1 = space();
    			div1 = element("div");
    			t2 = text("Welcome ");
    			t3 = text(t3_value);
    			t4 = space();
    			if_block.c();
    			t5 = space();
    			div3 = element("div");
    			div3.textContent = " ";
    			attr_dev(div0, "class", "dash text-info svelte-xpv1mi");
    			add_location(div0, file$8, 165, 4, 3625);
    			attr_dev(div1, "class", "username svelte-xpv1mi");
    			add_location(div1, file$8, 166, 4, 3673);
    			attr_dev(div2, "class", "content svelte-xpv1mi");
    			add_location(div2, file$8, 164, 2, 3599);
    			attr_dev(div3, "class", "my-5");
    			add_location(div3, file$8, 239, 2, 5833);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    			append_dev(div2, t4);
    			if_block.m(div2, null);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div3, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*username*/ 1 && t3_value !== (t3_value = /*username*/ ctx[0].toUpperCase() + "")) set_data_dev(t3, t3_value);

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(164:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (149:0) {#if username == null}
    function create_if_block$7(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let hr;
    	let t4;
    	let a0;
    	let t6;
    	let a1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Code Connector";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Create a developer profile/portfolio, share posts and get help from other\n      developers.";
    			t3 = space();
    			hr = element("hr");
    			t4 = space();
    			a0 = element("a");
    			a0.textContent = "Register";
    			t6 = space();
    			a1 = element("a");
    			a1.textContent = "Login";
    			attr_dev(h1, "class", "display-3 text-dark svelte-xpv1mi");
    			add_location(h1, file$8, 150, 4, 3173);
    			attr_dev(p, "class", "lead svelte-xpv1mi");
    			add_location(p, file$8, 151, 4, 3229);
    			attr_dev(hr, "class", "mt-3 hr svelte-xpv1mi");
    			add_location(hr, file$8, 155, 4, 3357);
    			attr_dev(a0, "class", "btn btn-dark mt-3 px-2 svelte-xpv1mi");
    			attr_dev(a0, "href", "/register");
    			attr_dev(a0, "role", "button");
    			add_location(a0, file$8, 156, 4, 3384);
    			attr_dev(a1, "class", "btn btn-dark mt-3 px-3 svelte-xpv1mi");
    			attr_dev(a1, "href", "/login");
    			attr_dev(a1, "role", "button");
    			add_location(a1, file$8, 159, 4, 3487);
    			attr_dev(div, "class", "jumbotron bg-dark text-light text-center rounded-0 svelte-xpv1mi");
    			add_location(div, file$8, 149, 2, 3104);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(div, t3);
    			append_dev(div, hr);
    			append_dev(div, t4);
    			append_dev(div, a0);
    			append_dev(div, t6);
    			append_dev(div, a1);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a0)),
    					action_destroyer(link.call(null, a1))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(149:0) {#if username == null}",
    		ctx
    	});

    	return block;
    }

    // (229:4) {:else}
    function create_else_block_1$1(ctx) {
    	let div;
    	let t1;
    	let a;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "You have not added any info to your profile yet, please do add some.";
    			t1 = space();
    			a = element("a");
    			button = element("button");
    			button.textContent = "Add Info";
    			add_location(div, file$8, 229, 6, 5597);
    			attr_dev(button, "class", "btn btn-info btn-sm mt-3 svelte-xpv1mi");
    			add_location(button, file$8, 233, 8, 5740);
    			attr_dev(a, "href", "/profileEdit");
    			add_location(a, file$8, 232, 6, 5699);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a, anchor);
    			append_dev(a, button);

    			if (!mounted) {
    				dispose = action_destroyer(link.call(null, a));
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(229:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (168:4) {#if userid}
    function create_if_block_1$6(ctx) {
    	let a0;
    	let t1;
    	let a1;
    	let t3;
    	let a2;
    	let t5;
    	let div0;
    	let t7;
    	let table0;
    	let thead0;
    	let tr0;
    	let th0;
    	let t9;
    	let th1;
    	let t11;
    	let th2;
    	let t13;
    	let tbody0;
    	let t14;
    	let div1;
    	let t16;
    	let table1;
    	let thead1;
    	let tr1;
    	let th3;
    	let t18;
    	let th4;
    	let t20;
    	let th5;
    	let t22;
    	let tbody1;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*userexps*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = /*useredus*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			a0.textContent = "Edit Info";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "Add Education";
    			t3 = space();
    			a2 = element("a");
    			a2.textContent = "Add Experience";
    			t5 = space();
    			div0 = element("div");
    			div0.textContent = "Experience Credentials";
    			t7 = space();
    			table0 = element("table");
    			thead0 = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Company";
    			t9 = space();
    			th1 = element("th");
    			th1.textContent = "Title";
    			t11 = space();
    			th2 = element("th");
    			th2.textContent = "Years";
    			t13 = space();
    			tbody0 = element("tbody");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t14 = space();
    			div1 = element("div");
    			div1.textContent = "Education Credentials";
    			t16 = space();
    			table1 = element("table");
    			thead1 = element("thead");
    			tr1 = element("tr");
    			th3 = element("th");
    			th3.textContent = "College";
    			t18 = space();
    			th4 = element("th");
    			th4.textContent = "Degree";
    			t20 = space();
    			th5 = element("th");
    			th5.textContent = "Years";
    			t22 = space();
    			tbody1 = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(a0, "href", "/profileEdit");
    			attr_dev(a0, "class", "btn btn-outline-info btn-sm mt-1 svelte-xpv1mi");
    			add_location(a0, file$8, 168, 6, 3757);
    			attr_dev(a1, "href", "/addEdu");
    			attr_dev(a1, "class", "btn btn-outline-info btn-sm mt-1 svelte-xpv1mi");
    			add_location(a1, file$8, 171, 6, 3866);
    			attr_dev(a2, "href", "/addExp");
    			attr_dev(a2, "class", "btn btn-outline-info btn-sm mt-1 svelte-xpv1mi");
    			add_location(a2, file$8, 174, 6, 3974);
    			attr_dev(div0, "class", "exp mt-4 text-info svelte-xpv1mi");
    			add_location(div0, file$8, 178, 6, 4084);
    			attr_dev(th0, "scope", "col");
    			add_location(th0, file$8, 184, 12, 4293);
    			attr_dev(th1, "scope", "col");
    			add_location(th1, file$8, 185, 12, 4334);
    			attr_dev(th2, "scope", "col");
    			add_location(th2, file$8, 186, 12, 4373);
    			add_location(tr0, file$8, 183, 10, 4276);
    			add_location(thead0, file$8, 182, 8, 4258);
    			add_location(tbody0, file$8, 189, 8, 4441);
    			attr_dev(table0, "class", "table table-hover table-sm table-borderless table-active\n        text-dark svelte-xpv1mi");
    			add_location(table0, file$8, 179, 6, 4151);
    			attr_dev(div1, "class", "exp mt-3 text-info svelte-xpv1mi");
    			add_location(div1, file$8, 202, 6, 4795);
    			attr_dev(th3, "scope", "col");
    			add_location(th3, file$8, 209, 12, 5004);
    			attr_dev(th4, "scope", "col");
    			add_location(th4, file$8, 210, 12, 5045);
    			attr_dev(th5, "scope", "col");
    			add_location(th5, file$8, 211, 12, 5085);
    			add_location(tr1, file$8, 208, 10, 4987);
    			add_location(thead1, file$8, 207, 8, 4969);
    			add_location(tbody1, file$8, 214, 8, 5153);
    			attr_dev(table1, "class", "table table-hover table-sm table-borderless table-active\n        text-dark svelte-xpv1mi");
    			add_location(table1, file$8, 204, 6, 4862);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, a2, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, table0, anchor);
    			append_dev(table0, thead0);
    			append_dev(thead0, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t9);
    			append_dev(tr0, th1);
    			append_dev(tr0, t11);
    			append_dev(tr0, th2);
    			append_dev(table0, t13);
    			append_dev(table0, tbody0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(tbody0, null);
    			}

    			insert_dev(target, t14, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, table1, anchor);
    			append_dev(table1, thead1);
    			append_dev(thead1, tr1);
    			append_dev(tr1, th3);
    			append_dev(tr1, t18);
    			append_dev(tr1, th4);
    			append_dev(tr1, t20);
    			append_dev(tr1, th5);
    			append_dev(table1, t22);
    			append_dev(table1, tbody1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody1, null);
    			}

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a0)),
    					action_destroyer(link.call(null, a1)),
    					action_destroyer(link.call(null, a2))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*dateformator, userexps*/ 20) {
    				each_value_1 = /*userexps*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(tbody0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*dateformator, useredus*/ 24) {
    				each_value = /*useredus*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(a2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(table0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(table1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$6.name,
    		type: "if",
    		source: "(168:4) {#if userid}",
    		ctx
    	});

    	return block;
    }

    // (191:10) {#each userexps as userexp}
    function create_each_block_1$1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*userexp*/ ctx[10].aff_company + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*userexp*/ ctx[10].job_title + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*dateformator*/ ctx[4](/*userexp*/ ctx[10].frm_date) + " - " + /*dateformator*/ ctx[4](/*userexp*/ ctx[10].to_date) + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			add_location(td0, file$8, 192, 14, 4518);
    			add_location(td1, file$8, 193, 14, 4563);
    			add_location(td2, file$8, 194, 14, 4606);
    			add_location(tr, file$8, 191, 12, 4499);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*userexps*/ 4 && t0_value !== (t0_value = /*userexp*/ ctx[10].aff_company + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*userexps*/ 4 && t2_value !== (t2_value = /*userexp*/ ctx[10].job_title + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*userexps*/ 4 && t4_value !== (t4_value = /*dateformator*/ ctx[4](/*userexp*/ ctx[10].frm_date) + " - " + /*dateformator*/ ctx[4](/*userexp*/ ctx[10].to_date) + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(191:10) {#each userexps as userexp}",
    		ctx
    	});

    	return block;
    }

    // (216:10) {#each useredus as useredu}
    function create_each_block$3(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*useredu*/ ctx[7].college + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*useredu*/ ctx[7].degree + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*dateformator*/ ctx[4](/*useredu*/ ctx[7].frm_date) + " - " + /*dateformator*/ ctx[4](/*useredu*/ ctx[7].to_date) + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			add_location(td0, file$8, 217, 14, 5230);
    			add_location(td1, file$8, 218, 14, 5271);
    			add_location(td2, file$8, 219, 14, 5311);
    			add_location(tr, file$8, 216, 12, 5211);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*useredus*/ 8 && t0_value !== (t0_value = /*useredu*/ ctx[7].college + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*useredus*/ 8 && t2_value !== (t2_value = /*useredu*/ ctx[7].degree + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*useredus*/ 8 && t4_value !== (t4_value = /*dateformator*/ ctx[4](/*useredu*/ ctx[7].frm_date) + " - " + /*dateformator*/ ctx[4](/*useredu*/ ctx[7].to_date) + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(216:10) {#each useredus as useredu}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let if_block0_anchor;
    	let t0;
    	let nav;
    	let t1;
    	let if_block1_anchor;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (/*username*/ ctx[0] == null) return create_if_block_2$5;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	nav = new Nav({ $$inline: true });

    	function select_block_type_1(ctx, dirty) {
    		if (/*username*/ ctx[0] == null) return create_if_block$7;
    		return create_else_block$3;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			if_block0.c();
    			if_block0_anchor = empty();
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block0.m(document.head, null);
    			append_dev(document.head, if_block0_anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(if_block0_anchor.parentNode, if_block0_anchor);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_block0.d(detaching);
    			detach_dev(if_block0_anchor);
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Index", slots, []);
    	let username = null;

    	onMount(() => {
    		$$invalidate(0, username = window.localStorage.getItem("username:authtoken"));

    		if (username != null) {
    			$$invalidate(0, username = username.split(":")[0]);
    		}

    		window.console.log("%cYashas Gowda (a.k.a Yacchi) developed this.\nPeace.", "color:#17a2b8;font-size:20px;");
    	});

    	let userid;
    	let userexps = [];
    	let useredus = [];
    	let devobjs = [];
    	let d;

    	let dateformator = date => {
    		d = new Date(date);
    		return d.toLocaleDateString();
    	};

    	onMount(() => {
    		if (username != null) {
    			fetch("https://yashas.pythonanywhere.com/api/developers/").then(res => res.json()).then(da => da.forEach(element => {
    				if (element.username == username) {
    					$$invalidate(1, userid = element.user);
    					localStorage.setItem("userid", userid);
    				}
    			}));

    			fetch("https://yashas.pythonanywhere.com/api/experiences/").then(res => res.json()).then(da => da.forEach(element => {
    				if (element.whose == localStorage.getItem("userid")) {
    					$$invalidate(2, userexps = [...userexps, element]);
    				}
    			}));

    			fetch("https://yashas.pythonanywhere.com/api/educations/").then(res => res.json()).then(da => da.forEach(element => {
    				if (element.whose == localStorage.getItem("userid")) {
    					$$invalidate(3, useredus = [...useredus, element]);
    				}
    			}));
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Nav,
    		onMount,
    		link,
    		username,
    		userid,
    		userexps,
    		useredus,
    		devobjs,
    		d,
    		dateformator
    	});

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    		if ("userid" in $$props) $$invalidate(1, userid = $$props.userid);
    		if ("userexps" in $$props) $$invalidate(2, userexps = $$props.userexps);
    		if ("useredus" in $$props) $$invalidate(3, useredus = $$props.useredus);
    		if ("devobjs" in $$props) devobjs = $$props.devobjs;
    		if ("d" in $$props) d = $$props.d;
    		if ("dateformator" in $$props) $$invalidate(4, dateformator = $$props.dateformator);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [username, userid, userexps, useredus, dateformator];
    }

    class Index extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/AddEdu.svelte generated by Svelte v3.38.3 */
    const file$7 = "src/AddEdu.svelte";

    // (69:0) {#if erroralert}
    function create_if_block_2$4(ctx) {
    	let div;
    	let strong;
    	let t1;
    	let button;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Error -->";
    			t1 = text("\r\n    Oops something went wrong. Peace.\r\n    ");
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			add_location(strong, file$7, 70, 4, 1447);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$7, 73, 6, 1602);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "alert");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$7, 72, 4, 1518);
    			attr_dev(div, "class", "alert alert-danger alert-dismissible fade show svelte-mhp0c5");
    			attr_dev(div, "role", "alert");
    			add_location(div, file$7, 69, 2, 1368);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(div, t1);
    			append_dev(div, button);
    			append_dev(button, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$4.name,
    		type: "if",
    		source: "(69:0) {#if erroralert}",
    		ctx
    	});

    	return block;
    }

    // (79:0) {#if updatealert}
    function create_if_block_1$5(ctx) {
    	let div;
    	let strong;
    	let t1;
    	let button;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Education Added -->";
    			t1 = text("\r\n    Successful.\r\n    ");
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			add_location(strong, file$7, 80, 4, 1775);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$7, 83, 6, 1918);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "alert");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$7, 82, 4, 1834);
    			attr_dev(div, "class", "alert alert-info alert-dismissible fade show svelte-mhp0c5");
    			attr_dev(div, "role", "alert");
    			add_location(div, file$7, 79, 2, 1698);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(div, t1);
    			append_dev(div, button);
    			append_dev(button, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(79:0) {#if updatealert}",
    		ctx
    	});

    	return block;
    }

    // (126:2) {#if addingtext}
    function create_if_block$6(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Adding...";
    			attr_dev(div, "class", "text-info my-1");
    			add_location(div, file$7, 126, 4, 3001);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(126:2) {#if addingtext}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let t0;
    	let nav;
    	let t1;
    	let t2;
    	let t3;
    	let div5;
    	let div0;
    	let t5;
    	let div1;
    	let input0;
    	let t6;
    	let div2;
    	let input1;
    	let t7;
    	let div3;
    	let span0;
    	let t9;
    	let input2;
    	let t10;
    	let div4;
    	let span1;
    	let t12;
    	let input3;
    	let t13;
    	let button0;
    	let t15;
    	let a;
    	let button1;
    	let t17;
    	let current;
    	let mounted;
    	let dispose;
    	nav = new Nav({ $$inline: true });
    	let if_block0 = /*erroralert*/ ctx[1] && create_if_block_2$4(ctx);
    	let if_block1 = /*updatealert*/ ctx[0] && create_if_block_1$5(ctx);
    	let if_block2 = /*addingtext*/ ctx[2] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			div5 = element("div");
    			div0 = element("div");
    			div0.textContent = "Add Education";
    			t5 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t6 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t7 = space();
    			div3 = element("div");
    			span0 = element("span");
    			span0.textContent = "From Date:";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			div4 = element("div");
    			span1 = element("span");
    			span1.textContent = "To Date:";
    			t12 = text("\r\n     \r\n    ");
    			input3 = element("input");
    			t13 = space();
    			button0 = element("button");
    			button0.textContent = "Add Education";
    			t15 = space();
    			a = element("a");
    			button1 = element("button");
    			button1.textContent = "Go Back";
    			t17 = space();
    			if (if_block2) if_block2.c();
    			document.title = "Add Education";
    			attr_dev(div0, "class", "cre my-4 svelte-mhp0c5");
    			add_location(div0, file$7, 89, 2, 2039);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "College");
    			attr_dev(input0, "aria-label", "Username");
    			attr_dev(input0, "aria-describedby", "basic-addon1");
    			add_location(input0, file$7, 92, 4, 2122);
    			attr_dev(div1, "class", "input-group my-2");
    			add_location(div1, file$7, 91, 2, 2086);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Degree");
    			attr_dev(input1, "aria-label", "Username");
    			attr_dev(input1, "aria-describedby", "basic-addon1");
    			add_location(input1, file$7, 102, 4, 2355);
    			attr_dev(div2, "class", "input-group my-2");
    			add_location(div2, file$7, 101, 2, 2319);
    			attr_dev(span0, "class", "mr-2");
    			add_location(span0, file$7, 112, 4, 2574);
    			attr_dev(input2, "type", "date");
    			add_location(input2, file$7, 113, 4, 2616);
    			attr_dev(div3, "class", "mt-3");
    			add_location(div3, file$7, 111, 2, 2550);
    			attr_dev(span1, "class", "mr-4");
    			add_location(span1, file$7, 116, 4, 2696);
    			attr_dev(input3, "type", "date");
    			add_location(input3, file$7, 118, 4, 2748);
    			attr_dev(div4, "class", "my-3");
    			add_location(div4, file$7, 115, 2, 2672);
    			attr_dev(button0, "class", "btn btn-info mt-2");
    			add_location(button0, file$7, 121, 2, 2805);
    			attr_dev(button1, "class", "btn btn-light mt-2 ml-2");
    			add_location(button1, file$7, 123, 4, 2911);
    			attr_dev(a, "href", "/");
    			add_location(a, file$7, 122, 2, 2884);
    			attr_dev(div5, "class", "form svelte-mhp0c5");
    			set_style(div5, "max-width", "10in");
    			add_location(div5, file$7, 88, 0, 1993);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div5, t5);
    			append_dev(div5, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*college*/ ctx[3]);
    			append_dev(div5, t6);
    			append_dev(div5, div2);
    			append_dev(div2, input1);
    			set_input_value(input1, /*degree*/ ctx[4]);
    			append_dev(div5, t7);
    			append_dev(div5, div3);
    			append_dev(div3, span0);
    			append_dev(div3, t9);
    			append_dev(div3, input2);
    			set_input_value(input2, /*frmdate*/ ctx[5]);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			append_dev(div4, span1);
    			append_dev(div4, t12);
    			append_dev(div4, input3);
    			set_input_value(input3, /*todate*/ ctx[6]);
    			append_dev(div5, t13);
    			append_dev(div5, button0);
    			append_dev(div5, t15);
    			append_dev(div5, a);
    			append_dev(a, button1);
    			append_dev(div5, t17);
    			if (if_block2) if_block2.m(div5, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[10]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[11]),
    					listen_dev(button0, "click", /*sendfun*/ ctx[7], false, false, false),
    					action_destroyer(link.call(null, a))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*erroralert*/ ctx[1]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2$4(ctx);
    					if_block0.c();
    					if_block0.m(t2.parentNode, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*updatealert*/ ctx[0]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$5(ctx);
    					if_block1.c();
    					if_block1.m(t3.parentNode, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*college*/ 8 && input0.value !== /*college*/ ctx[3]) {
    				set_input_value(input0, /*college*/ ctx[3]);
    			}

    			if (dirty & /*degree*/ 16 && input1.value !== /*degree*/ ctx[4]) {
    				set_input_value(input1, /*degree*/ ctx[4]);
    			}

    			if (dirty & /*frmdate*/ 32) {
    				set_input_value(input2, /*frmdate*/ ctx[5]);
    			}

    			if (dirty & /*todate*/ 64) {
    				set_input_value(input3, /*todate*/ ctx[6]);
    			}

    			if (/*addingtext*/ ctx[2]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block$6(ctx);
    					if_block2.c();
    					if_block2.m(div5, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div5);
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AddEdu", slots, []);
    	let updatealert = false, erroralert = false, addingtext = false;
    	let college = "", degree = "", frmdate, todate;

    	let sendfun = () => {
    		$$invalidate(2, addingtext = true);

    		//console.log(company,jobtitle,location,jobdes,frmdate,todate)
    		fetch("https://yashas.pythonanywhere.com/api/educations/", {
    			headers: {
    				"Content-Type": "application/json",
    				Authorization: "Token " + localStorage.getItem("username:authtoken").split(":")[1]
    			},
    			method: "POST",
    			body: JSON.stringify({
    				college,
    				degree,
    				to_date: todate,
    				frm_date: frmdate
    			})
    		}).then(res => res).then(da => {
    			da.ok
    			? $$invalidate(0, updatealert = true)
    			: $$invalidate(1, erroralert = true);

    			$$invalidate(2, addingtext = false);
    			window.scrollTo(0, 0);
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AddEdu> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		college = this.value;
    		$$invalidate(3, college);
    	}

    	function input1_input_handler() {
    		degree = this.value;
    		$$invalidate(4, degree);
    	}

    	function input2_input_handler() {
    		frmdate = this.value;
    		$$invalidate(5, frmdate);
    	}

    	function input3_input_handler() {
    		todate = this.value;
    		$$invalidate(6, todate);
    	}

    	$$self.$capture_state = () => ({
    		link,
    		Nav,
    		updatealert,
    		erroralert,
    		addingtext,
    		college,
    		degree,
    		frmdate,
    		todate,
    		sendfun
    	});

    	$$self.$inject_state = $$props => {
    		if ("updatealert" in $$props) $$invalidate(0, updatealert = $$props.updatealert);
    		if ("erroralert" in $$props) $$invalidate(1, erroralert = $$props.erroralert);
    		if ("addingtext" in $$props) $$invalidate(2, addingtext = $$props.addingtext);
    		if ("college" in $$props) $$invalidate(3, college = $$props.college);
    		if ("degree" in $$props) $$invalidate(4, degree = $$props.degree);
    		if ("frmdate" in $$props) $$invalidate(5, frmdate = $$props.frmdate);
    		if ("todate" in $$props) $$invalidate(6, todate = $$props.todate);
    		if ("sendfun" in $$props) $$invalidate(7, sendfun = $$props.sendfun);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		updatealert,
    		erroralert,
    		addingtext,
    		college,
    		degree,
    		frmdate,
    		todate,
    		sendfun,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler
    	];
    }

    class AddEdu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AddEdu",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/AddExp.svelte generated by Svelte v3.38.3 */
    const file$6 = "src/AddExp.svelte";

    // (73:0) {#if erroralert}
    function create_if_block_2$3(ctx) {
    	let div;
    	let strong;
    	let t1;
    	let button;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Error -->";
    			t1 = text("\r\n    Oops something went wrong. Peace.\r\n    ");
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			add_location(strong, file$6, 74, 4, 1556);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$6, 77, 6, 1711);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "alert");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$6, 76, 4, 1627);
    			attr_dev(div, "class", "alert alert-danger alert-dismissible fade show svelte-mhp0c5");
    			attr_dev(div, "role", "alert");
    			add_location(div, file$6, 73, 2, 1477);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(div, t1);
    			append_dev(div, button);
    			append_dev(button, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(73:0) {#if erroralert}",
    		ctx
    	});

    	return block;
    }

    // (83:0) {#if updatealert}
    function create_if_block_1$4(ctx) {
    	let div;
    	let strong;
    	let t1;
    	let button;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Experience Added -->";
    			t1 = text("\r\n    Successful.\r\n    ");
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			add_location(strong, file$6, 84, 4, 1884);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$6, 87, 6, 2028);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "data-dismiss", "alert");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$6, 86, 4, 1944);
    			attr_dev(div, "class", "alert alert-info alert-dismissible fade show svelte-mhp0c5");
    			attr_dev(div, "role", "alert");
    			add_location(div, file$6, 83, 2, 1807);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(div, t1);
    			append_dev(div, button);
    			append_dev(button, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(83:0) {#if updatealert}",
    		ctx
    	});

    	return block;
    }

    // (155:2) {#if addingtext}
    function create_if_block$5(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Adding...";
    			attr_dev(div, "class", "text-info mt-1 mb-4");
    			add_location(div, file$6, 155, 4, 3793);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(155:2) {#if addingtext}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let t0;
    	let nav;
    	let t1;
    	let t2;
    	let t3;
    	let div7;
    	let div0;
    	let t5;
    	let div1;
    	let input0;
    	let t6;
    	let div2;
    	let input1;
    	let t7;
    	let div3;
    	let input2;
    	let t8;
    	let small0;
    	let t10;
    	let div4;
    	let span0;
    	let t12;
    	let input3;
    	let t13;
    	let div5;
    	let span1;
    	let t15;
    	let input4;
    	let t16;
    	let div6;
    	let textarea;
    	let t17;
    	let small1;
    	let t19;
    	let button0;
    	let t21;
    	let a;
    	let button1;
    	let t23;
    	let current;
    	let mounted;
    	let dispose;
    	nav = new Nav({ $$inline: true });
    	let if_block0 = /*erroralert*/ ctx[1] && create_if_block_2$3(ctx);
    	let if_block1 = /*updatealert*/ ctx[0] && create_if_block_1$4(ctx);
    	let if_block2 = /*addingtext*/ ctx[2] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			div7 = element("div");
    			div0 = element("div");
    			div0.textContent = "Add Experience";
    			t5 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t6 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t7 = space();
    			div3 = element("div");
    			input2 = element("input");
    			t8 = space();
    			small0 = element("small");
    			small0.textContent = " City & state suggested (eg. Bengaluru, Karnataka).";
    			t10 = space();
    			div4 = element("div");
    			span0 = element("span");
    			span0.textContent = "From Date:";
    			t12 = space();
    			input3 = element("input");
    			t13 = space();
    			div5 = element("div");
    			span1 = element("span");
    			span1.textContent = "To Date:";
    			t15 = text("\r\n     \r\n    ");
    			input4 = element("input");
    			t16 = space();
    			div6 = element("div");
    			textarea = element("textarea");
    			t17 = space();
    			small1 = element("small");
    			small1.textContent = " Description of how your job was.";
    			t19 = space();
    			button0 = element("button");
    			button0.textContent = "Add Experience";
    			t21 = space();
    			a = element("a");
    			button1 = element("button");
    			button1.textContent = "Go Back";
    			t23 = space();
    			if (if_block2) if_block2.c();
    			document.title = "Add Experience";
    			attr_dev(div0, "class", "cre my-4 svelte-mhp0c5");
    			add_location(div0, file$6, 93, 2, 2149);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Company Name");
    			attr_dev(input0, "aria-label", "Username");
    			attr_dev(input0, "aria-describedby", "basic-addon1");
    			add_location(input0, file$6, 96, 4, 2233);
    			attr_dev(div1, "class", "input-group my-2");
    			add_location(div1, file$6, 95, 2, 2197);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Job Title");
    			attr_dev(input1, "aria-label", "Username");
    			attr_dev(input1, "aria-describedby", "basic-addon1");
    			add_location(input1, file$6, 106, 4, 2471);
    			attr_dev(div2, "class", "input-group my-2");
    			add_location(div2, file$6, 105, 2, 2435);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "placeholder", "Location of the Company");
    			attr_dev(input2, "aria-label", "Username");
    			attr_dev(input2, "aria-describedby", "basic-addon1");
    			add_location(input2, file$6, 116, 4, 2707);
    			attr_dev(div3, "class", "input-group my-2");
    			add_location(div3, file$6, 115, 2, 2671);
    			attr_dev(small0, "id", "emailHelp");
    			attr_dev(small0, "class", "form-text text-muted mb-3");
    			add_location(small0, file$6, 125, 2, 2921);
    			attr_dev(span0, "class", "mr-2");
    			add_location(span0, file$6, 130, 4, 3068);
    			attr_dev(input3, "type", "date");
    			add_location(input3, file$6, 131, 4, 3110);
    			add_location(div4, file$6, 129, 2, 3057);
    			attr_dev(span1, "class", "mr-4");
    			add_location(span1, file$6, 134, 4, 3190);
    			attr_dev(input4, "type", "date");
    			add_location(input4, file$6, 136, 4, 3242);
    			attr_dev(div5, "class", "my-3");
    			add_location(div5, file$6, 133, 2, 3166);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "placeholder", "Job Description.");
    			attr_dev(textarea, "aria-label", "With textarea");
    			add_location(textarea, file$6, 140, 4, 3335);
    			attr_dev(div6, "class", "input-group my-2");
    			add_location(div6, file$6, 139, 2, 3299);
    			attr_dev(small1, "id", "emailHelp");
    			attr_dev(small1, "class", "form-text text-muted mb-3");
    			add_location(small1, file$6, 146, 2, 3488);
    			attr_dev(button0, "class", "btn btn-info");
    			add_location(button0, file$6, 150, 2, 3606);
    			attr_dev(button1, "class", "btn btn-light ml-2");
    			add_location(button1, file$6, 152, 4, 3708);
    			attr_dev(a, "href", "/");
    			add_location(a, file$6, 151, 2, 3681);
    			attr_dev(div7, "class", "form svelte-mhp0c5");
    			set_style(div7, "max-width", "10in");
    			add_location(div7, file$6, 92, 0, 2103);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div7, t5);
    			append_dev(div7, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*company*/ ctx[3]);
    			append_dev(div7, t6);
    			append_dev(div7, div2);
    			append_dev(div2, input1);
    			set_input_value(input1, /*jobtitle*/ ctx[4]);
    			append_dev(div7, t7);
    			append_dev(div7, div3);
    			append_dev(div3, input2);
    			set_input_value(input2, /*location*/ ctx[5]);
    			append_dev(div7, t8);
    			append_dev(div7, small0);
    			append_dev(div7, t10);
    			append_dev(div7, div4);
    			append_dev(div4, span0);
    			append_dev(div4, t12);
    			append_dev(div4, input3);
    			set_input_value(input3, /*frmdate*/ ctx[7]);
    			append_dev(div7, t13);
    			append_dev(div7, div5);
    			append_dev(div5, span1);
    			append_dev(div5, t15);
    			append_dev(div5, input4);
    			set_input_value(input4, /*todate*/ ctx[8]);
    			append_dev(div7, t16);
    			append_dev(div7, div6);
    			append_dev(div6, textarea);
    			set_input_value(textarea, /*jobdes*/ ctx[6]);
    			append_dev(div7, t17);
    			append_dev(div7, small1);
    			append_dev(div7, t19);
    			append_dev(div7, button0);
    			append_dev(div7, t21);
    			append_dev(div7, a);
    			append_dev(a, button1);
    			append_dev(div7, t23);
    			if (if_block2) if_block2.m(div7, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[12]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[13]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[14]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[15]),
    					listen_dev(button0, "click", /*sendfun*/ ctx[9], false, false, false),
    					action_destroyer(link.call(null, a))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*erroralert*/ ctx[1]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2$3(ctx);
    					if_block0.c();
    					if_block0.m(t2.parentNode, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*updatealert*/ ctx[0]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$4(ctx);
    					if_block1.c();
    					if_block1.m(t3.parentNode, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*company*/ 8 && input0.value !== /*company*/ ctx[3]) {
    				set_input_value(input0, /*company*/ ctx[3]);
    			}

    			if (dirty & /*jobtitle*/ 16 && input1.value !== /*jobtitle*/ ctx[4]) {
    				set_input_value(input1, /*jobtitle*/ ctx[4]);
    			}

    			if (dirty & /*location*/ 32 && input2.value !== /*location*/ ctx[5]) {
    				set_input_value(input2, /*location*/ ctx[5]);
    			}

    			if (dirty & /*frmdate*/ 128) {
    				set_input_value(input3, /*frmdate*/ ctx[7]);
    			}

    			if (dirty & /*todate*/ 256) {
    				set_input_value(input4, /*todate*/ ctx[8]);
    			}

    			if (dirty & /*jobdes*/ 64) {
    				set_input_value(textarea, /*jobdes*/ ctx[6]);
    			}

    			if (/*addingtext*/ ctx[2]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block$5(ctx);
    					if_block2.c();
    					if_block2.m(div7, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div7);
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AddExp", slots, []);
    	let updatealert = false, erroralert = false, addingtext = false;
    	let company = "", jobtitle = "", location = "", jobdes = "", frmdate, todate;

    	let sendfun = () => {
    		$$invalidate(2, addingtext = true);

    		//console.log(company,jobtitle,location,jobdes,frmdate,todate)
    		fetch("https://yashas.pythonanywhere.com/api/experiences/", {
    			headers: {
    				"Content-Type": "application/json",
    				Authorization: "Token " + localStorage.getItem("username:authtoken").split(":")[1]
    			},
    			method: "POST",
    			body: JSON.stringify({
    				aff_company: company,
    				loc_company: location,
    				job_title: jobtitle,
    				job_des: jobdes,
    				to_date: todate,
    				frm_date: frmdate
    			})
    		}).then(res => res).then(da => {
    			da.ok
    			? $$invalidate(0, updatealert = true)
    			: $$invalidate(1, erroralert = true);

    			$$invalidate(2, addingtext = false);
    			window.scrollTo(0, 0);
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AddExp> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		company = this.value;
    		$$invalidate(3, company);
    	}

    	function input1_input_handler() {
    		jobtitle = this.value;
    		$$invalidate(4, jobtitle);
    	}

    	function input2_input_handler() {
    		location = this.value;
    		$$invalidate(5, location);
    	}

    	function input3_input_handler() {
    		frmdate = this.value;
    		$$invalidate(7, frmdate);
    	}

    	function input4_input_handler() {
    		todate = this.value;
    		$$invalidate(8, todate);
    	}

    	function textarea_input_handler() {
    		jobdes = this.value;
    		$$invalidate(6, jobdes);
    	}

    	$$self.$capture_state = () => ({
    		link,
    		Nav,
    		updatealert,
    		erroralert,
    		addingtext,
    		company,
    		jobtitle,
    		location,
    		jobdes,
    		frmdate,
    		todate,
    		sendfun
    	});

    	$$self.$inject_state = $$props => {
    		if ("updatealert" in $$props) $$invalidate(0, updatealert = $$props.updatealert);
    		if ("erroralert" in $$props) $$invalidate(1, erroralert = $$props.erroralert);
    		if ("addingtext" in $$props) $$invalidate(2, addingtext = $$props.addingtext);
    		if ("company" in $$props) $$invalidate(3, company = $$props.company);
    		if ("jobtitle" in $$props) $$invalidate(4, jobtitle = $$props.jobtitle);
    		if ("location" in $$props) $$invalidate(5, location = $$props.location);
    		if ("jobdes" in $$props) $$invalidate(6, jobdes = $$props.jobdes);
    		if ("frmdate" in $$props) $$invalidate(7, frmdate = $$props.frmdate);
    		if ("todate" in $$props) $$invalidate(8, todate = $$props.todate);
    		if ("sendfun" in $$props) $$invalidate(9, sendfun = $$props.sendfun);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		updatealert,
    		erroralert,
    		addingtext,
    		company,
    		jobtitle,
    		location,
    		jobdes,
    		frmdate,
    		todate,
    		sendfun,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		textarea_input_handler
    	];
    }

    class AddExp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AddExp",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/DevDetails.svelte generated by Svelte v3.38.3 */
    const file$5 = "src/DevDetails.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (66:6) {#if devobj.portfolioweb != null}
    function create_if_block_6(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text("Web");
    			attr_dev(a, "class", "btn btn-sm btn-outline-light mb-2");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", /*devobj*/ ctx[2].portfolioweb);
    			attr_dev(a, "role", "button");
    			add_location(a, file$5, 66, 8, 1626);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(66:6) {#if devobj.portfolioweb != null}",
    		ctx
    	});

    	return block;
    }

    // (75:6) {#if devobj.github != null}
    function create_if_block_5(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text("GitHub");
    			attr_dev(a, "class", "btn btn-sm btn-outline-light mb-2");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", "https://github.com/" + /*devobj*/ ctx[2].github + "/");
    			attr_dev(a, "role", "button");
    			add_location(a, file$5, 75, 8, 1859);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(75:6) {#if devobj.github != null}",
    		ctx
    	});

    	return block;
    }

    // (84:6) {#if devobj.linkedinlink != null}
    function create_if_block_4(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text("LinkedIn");
    			attr_dev(a, "class", "btn btn-sm btn-outline-light mb-2");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", /*devobj*/ ctx[2].linkedinlink);
    			attr_dev(a, "role", "button");
    			add_location(a, file$5, 84, 8, 2117);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(84:6) {#if devobj.linkedinlink != null}",
    		ctx
    	});

    	return block;
    }

    // (93:6) {#if devobj.tweetlink != null}
    function create_if_block_3$1(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text("Twitter");
    			attr_dev(a, "class", "btn btn-sm btn-outline-light mb-2");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", /*devobj*/ ctx[2].tweetlink);
    			attr_dev(a, "role", "button");
    			add_location(a, file$5, 93, 8, 2358);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(93:6) {#if devobj.tweetlink != null}",
    		ctx
    	});

    	return block;
    }

    // (102:6) {#if devobj.fblink != null}
    function create_if_block_2$2(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text("Facebook");
    			attr_dev(a, "class", "btn btn-sm btn-outline-light mb-2");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", /*devobj*/ ctx[2].fblink);
    			attr_dev(a, "role", "button");
    			add_location(a, file$5, 102, 8, 2592);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(102:6) {#if devobj.fblink != null}",
    		ctx
    	});

    	return block;
    }

    // (111:6) {#if devobj.instalink != null}
    function create_if_block_1$3(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text("Instagram");
    			attr_dev(a, "class", "btn btn-sm btn-outline-light mb-2");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", /*devobj*/ ctx[2].instalink);
    			attr_dev(a, "role", "button");
    			add_location(a, file$5, 111, 8, 2827);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(111:6) {#if devobj.instalink != null}",
    		ctx
    	});

    	return block;
    }

    // (120:6) {#if devobj.youtubelink != null}
    function create_if_block$4(ctx) {
    	let a;
    	let t;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text("Youtube");
    			attr_dev(a, "class", "btn btn-sm btn-outline-light mb-2");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", /*devobj*/ ctx[2].youtubelink);
    			attr_dev(a, "role", "button");
    			add_location(a, file$5, 120, 8, 3068);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(120:6) {#if devobj.youtubelink != null}",
    		ctx
    	});

    	return block;
    }

    // (139:4) {#each devobj.skills.split(',') as skill}
    function create_each_block_2(ctx) {
    	let span;
    	let t0_value = /*skill*/ ctx[10].trim() + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			set_style(span, "border-radius", "15px");
    			set_style(span, "display", "inline-block");
    			attr_dev(span, "class", "bg-info center text-light mr-1 px-2 mb-1");
    			add_location(span, file$5, 139, 6, 3595);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(139:4) {#each devobj.skills.split(',') as skill}",
    		ctx
    	});

    	return block;
    }

    // (172:10) {:else}
    function create_else_block_1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Not Available";
    			attr_dev(div, "class", "text-dark");
    			add_location(div, file$5, 172, 12, 4632);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(172:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (155:10) {#each devexps as devexp}
    function create_each_block_1(ctx) {
    	let div0;
    	let t0_value = /*devexp*/ ctx[7].aff_company + "";
    	let t0;
    	let t1;
    	let div1;
    	let strong0;
    	let t3;
    	let t4_value = /*devexp*/ ctx[7].frm_date + "";
    	let t4;
    	let t5;
    	let strong1;
    	let t7;
    	let t8_value = /*devexp*/ ctx[7].to_date + "";
    	let t8;
    	let t9;
    	let div2;
    	let strong2;
    	let t11;
    	let t12_value = /*devexp*/ ctx[7].job_title + "";
    	let t12;
    	let t13;
    	let div3;
    	let strong3;
    	let t15;
    	let t16_value = /*devexp*/ ctx[7].job_des + "";
    	let t16;
    	let t17;
    	let br;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			strong0 = element("strong");
    			strong0.textContent = "From";
    			t3 = text("\r\n              : ");
    			t4 = text(t4_value);
    			t5 = text("  \r\n              ");
    			strong1 = element("strong");
    			strong1.textContent = "To";
    			t7 = text("\r\n              : ");
    			t8 = text(t8_value);
    			t9 = space();
    			div2 = element("div");
    			strong2 = element("strong");
    			strong2.textContent = "Position";
    			t11 = text("\r\n              : ");
    			t12 = text(t12_value);
    			t13 = space();
    			div3 = element("div");
    			strong3 = element("strong");
    			strong3.textContent = "Description";
    			t15 = text("\r\n              : ");
    			t16 = text(t16_value);
    			t17 = space();
    			br = element("br");
    			attr_dev(div0, "class", "car text-dark svelte-1r8fbnk");
    			add_location(div0, file$5, 155, 12, 4052);
    			add_location(strong0, file$5, 157, 14, 4158);
    			add_location(strong1, file$5, 159, 14, 4237);
    			attr_dev(div1, "class", "text-dark");
    			add_location(div1, file$5, 156, 12, 4119);
    			add_location(strong2, file$5, 163, 14, 4363);
    			attr_dev(div2, "class", "text-dark");
    			add_location(div2, file$5, 162, 12, 4324);
    			add_location(strong3, file$5, 167, 14, 4497);
    			attr_dev(div3, "class", "text-dark");
    			add_location(div3, file$5, 166, 12, 4458);
    			add_location(br, file$5, 170, 12, 4593);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, strong0);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div1, t5);
    			append_dev(div1, strong1);
    			append_dev(div1, t7);
    			append_dev(div1, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, strong2);
    			append_dev(div2, t11);
    			append_dev(div2, t12);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, strong3);
    			append_dev(div3, t15);
    			append_dev(div3, t16);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*devexps*/ 1 && t0_value !== (t0_value = /*devexp*/ ctx[7].aff_company + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*devexps*/ 1 && t4_value !== (t4_value = /*devexp*/ ctx[7].frm_date + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*devexps*/ 1 && t8_value !== (t8_value = /*devexp*/ ctx[7].to_date + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*devexps*/ 1 && t12_value !== (t12_value = /*devexp*/ ctx[7].job_title + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*devexps*/ 1 && t16_value !== (t16_value = /*devexp*/ ctx[7].job_des + "")) set_data_dev(t16, t16_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(155:10) {#each devexps as devexp}",
    		ctx
    	});

    	return block;
    }

    // (195:10) {:else}
    function create_else_block$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Not Available";
    			attr_dev(div, "class", "text-dark");
    			add_location(div, file$5, 195, 12, 5384);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(195:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (182:10) {#each devedus as devedu}
    function create_each_block$2(ctx) {
    	let div0;
    	let t0_value = /*devedu*/ ctx[4].college + "";
    	let t0;
    	let t1;
    	let div1;
    	let strong0;
    	let t3;
    	let t4_value = /*devedu*/ ctx[4].frm_date + "";
    	let t4;
    	let t5;
    	let strong1;
    	let t7;
    	let t8_value = /*devedu*/ ctx[4].to_date + "";
    	let t8;
    	let t9;
    	let div2;
    	let strong2;
    	let t11;
    	let t12_value = /*devedu*/ ctx[4].degree + "";
    	let t12;
    	let t13;
    	let br;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			strong0 = element("strong");
    			strong0.textContent = "From";
    			t3 = text("\r\n              : ");
    			t4 = text(t4_value);
    			t5 = text("  \r\n              ");
    			strong1 = element("strong");
    			strong1.textContent = "To";
    			t7 = text("\r\n              : ");
    			t8 = text(t8_value);
    			t9 = space();
    			div2 = element("div");
    			strong2 = element("strong");
    			strong2.textContent = "Degree";
    			t11 = text("\r\n              : ");
    			t12 = text(t12_value);
    			t13 = space();
    			br = element("br");
    			attr_dev(div0, "class", "car text-dark svelte-1r8fbnk");
    			add_location(div0, file$5, 182, 12, 4948);
    			add_location(strong0, file$5, 184, 14, 5050);
    			add_location(strong1, file$5, 186, 14, 5129);
    			attr_dev(div1, "class", "text-dark");
    			add_location(div1, file$5, 183, 12, 5011);
    			add_location(strong2, file$5, 190, 14, 5255);
    			attr_dev(div2, "class", "text-dark");
    			add_location(div2, file$5, 189, 12, 5216);
    			add_location(br, file$5, 193, 12, 5345);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, strong0);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div1, t5);
    			append_dev(div1, strong1);
    			append_dev(div1, t7);
    			append_dev(div1, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, strong2);
    			append_dev(div2, t11);
    			append_dev(div2, t12);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*devedus*/ 2 && t0_value !== (t0_value = /*devedu*/ ctx[4].college + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*devedus*/ 2 && t4_value !== (t4_value = /*devedu*/ ctx[4].frm_date + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*devedus*/ 2 && t8_value !== (t8_value = /*devedu*/ ctx[4].to_date + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*devedus*/ 2 && t12_value !== (t12_value = /*devedu*/ ctx[4].degree + "")) set_data_dev(t12, t12_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(182:10) {#each devedus as devedu}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let title_value;
    	let t0;
    	let nav;
    	let t1;
    	let div5;
    	let div4;
    	let img;
    	let img_src_value;
    	let t2;
    	let div0;
    	let t4;
    	let div1;
    	let t6;
    	let div2;
    	let t8;
    	let div3;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let div9;
    	let div8;
    	let div6;
    	let t18;
    	let t19_value = /*devobj*/ ctx[2].bio + "";
    	let t19;
    	let t20;
    	let hr;
    	let t21;
    	let div7;
    	let t23;
    	let t24;
    	let div19;
    	let div18;
    	let div13;
    	let div12;
    	let div11;
    	let div10;
    	let t26;
    	let t27;
    	let div17;
    	let div16;
    	let div15;
    	let div14;
    	let t29;
    	let t30;
    	let div20;
    	let current;
    	document.title = title_value = "" + (/*devobj*/ ctx[2].username.toUpperCase() + "'s Details");
    	nav = new Nav({ $$inline: true });
    	let if_block0 = /*devobj*/ ctx[2].portfolioweb != null && create_if_block_6(ctx);
    	let if_block1 = /*devobj*/ ctx[2].github != null && create_if_block_5(ctx);
    	let if_block2 = /*devobj*/ ctx[2].linkedinlink != null && create_if_block_4(ctx);
    	let if_block3 = /*devobj*/ ctx[2].tweetlink != null && create_if_block_3$1(ctx);
    	let if_block4 = /*devobj*/ ctx[2].fblink != null && create_if_block_2$2(ctx);
    	let if_block5 = /*devobj*/ ctx[2].instalink != null && create_if_block_1$3(ctx);
    	let if_block6 = /*devobj*/ ctx[2].youtubelink != null && create_if_block$4(ctx);
    	let each_value_2 = /*devobj*/ ctx[2].skills.split(",");
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*devexps*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each1_else = null;

    	if (!each_value_1.length) {
    		each1_else = create_else_block_1(ctx);
    	}

    	let each_value = /*devedus*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	let each2_else = null;

    	if (!each_value.length) {
    		each2_else = create_else_block$2(ctx);
    	}

    	const block = {
    		c: function create() {
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			div5 = element("div");
    			div4 = element("div");
    			img = element("img");
    			t2 = space();
    			div0 = element("div");
    			div0.textContent = `${/*devobj*/ ctx[2].username.toUpperCase()}`;
    			t4 = space();
    			div1 = element("div");
    			div1.textContent = `${/*devobj*/ ctx[2].career}`;
    			t6 = space();
    			div2 = element("div");
    			div2.textContent = `${/*devobj*/ ctx[2].location}`;
    			t8 = space();
    			div3 = element("div");
    			if (if_block0) if_block0.c();
    			t9 = space();
    			if (if_block1) if_block1.c();
    			t10 = space();
    			if (if_block2) if_block2.c();
    			t11 = space();
    			if (if_block3) if_block3.c();
    			t12 = space();
    			if (if_block4) if_block4.c();
    			t13 = space();
    			if (if_block5) if_block5.c();
    			t14 = space();
    			if (if_block6) if_block6.c();
    			t15 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div6 = element("div");
    			div6.textContent = `${/*devobj*/ ctx[2].username.toUpperCase()}'s Bio`;
    			t18 = space();
    			t19 = text(t19_value);
    			t20 = space();
    			hr = element("hr");
    			t21 = space();
    			div7 = element("div");
    			div7.textContent = "Skills";
    			t23 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t24 = space();
    			div19 = element("div");
    			div18 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			div10.textContent = "Experience";
    			t26 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			if (each1_else) {
    				each1_else.c();
    			}

    			t27 = space();
    			div17 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			div14 = element("div");
    			div14.textContent = "Education";
    			t29 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each2_else) {
    				each2_else.c();
    			}

    			t30 = space();
    			div20 = element("div");
    			set_style(img, "max-width", "300px");

    			if (img.src !== (img_src_value = /*devobj*/ ctx[2].avatarurl
    			? /*devobj*/ ctx[2].avatarurl
    			: "https://yashas.pythonanywhere.com/static/img/profile-icon.png")) attr_dev(img, "src", img_src_value);

    			attr_dev(img, "class", "rounded-circle mb-4");
    			attr_dev(img, "alt", "");
    			add_location(img, file$5, 56, 4, 1141);
    			attr_dev(div0, "class", "usr text-center svelte-1r8fbnk");
    			add_location(div0, file$5, 61, 4, 1350);
    			attr_dev(div1, "class", "car text-center svelte-1r8fbnk");
    			add_location(div1, file$5, 62, 4, 1422);
    			attr_dev(div2, "class", "text-center mt-4");
    			add_location(div2, file$5, 63, 4, 1478);
    			attr_dev(div3, "class", "mx-auto my-2 text-center");
    			add_location(div3, file$5, 64, 4, 1537);
    			attr_dev(div4, "class", "card-body text-center");
    			add_location(div4, file$5, 55, 2, 1100);
    			attr_dev(div5, "class", "card bg-info mx-auto mt-3 svelte-1r8fbnk");
    			add_location(div5, file$5, 53, 0, 1055);
    			attr_dev(div6, "class", "user text-info svelte-1r8fbnk");
    			add_location(div6, file$5, 134, 4, 3388);
    			add_location(hr, file$5, 136, 4, 3483);
    			attr_dev(div7, "class", "user text-info mb-2 svelte-1r8fbnk");
    			add_location(div7, file$5, 137, 4, 3495);
    			attr_dev(div8, "class", "card-body text-dark text-center");
    			add_location(div8, file$5, 133, 2, 3337);
    			attr_dev(div9, "class", "card bg-light my-3 mx-auto svelte-1r8fbnk");
    			add_location(div9, file$5, 132, 0, 3293);
    			attr_dev(div10, "class", "user text-info svelte-1r8fbnk");
    			add_location(div10, file$5, 153, 10, 3957);
    			attr_dev(div11, "class", "card-body");
    			add_location(div11, file$5, 152, 8, 3922);
    			attr_dev(div12, "class", "card border border-light svelte-1r8fbnk");
    			add_location(div12, file$5, 151, 6, 3874);
    			attr_dev(div13, "class", "col-md-6");
    			add_location(div13, file$5, 150, 4, 3844);
    			attr_dev(div14, "class", "user text-info svelte-1r8fbnk");
    			add_location(div14, file$5, 180, 10, 4854);
    			attr_dev(div15, "class", "card-body");
    			add_location(div15, file$5, 179, 8, 4819);
    			attr_dev(div16, "class", "card border border-light svelte-1r8fbnk");
    			add_location(div16, file$5, 178, 6, 4771);
    			attr_dev(div17, "class", "col-md-6");
    			add_location(div17, file$5, 177, 4, 4741);
    			attr_dev(div18, "class", "row");
    			add_location(div18, file$5, 149, 2, 3821);
    			attr_dev(div19, "class", "card mx-auto svelte-1r8fbnk");
    			add_location(div19, file$5, 148, 0, 3791);
    			attr_dev(div20, "class", "my-4");
    			add_location(div20, file$5, 203, 0, 5509);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, img);
    			append_dev(div4, t2);
    			append_dev(div4, div0);
    			append_dev(div4, t4);
    			append_dev(div4, div1);
    			append_dev(div4, t6);
    			append_dev(div4, div2);
    			append_dev(div4, t8);
    			append_dev(div4, div3);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t9);
    			if (if_block1) if_block1.m(div3, null);
    			append_dev(div3, t10);
    			if (if_block2) if_block2.m(div3, null);
    			append_dev(div3, t11);
    			if (if_block3) if_block3.m(div3, null);
    			append_dev(div3, t12);
    			if (if_block4) if_block4.m(div3, null);
    			append_dev(div3, t13);
    			if (if_block5) if_block5.m(div3, null);
    			append_dev(div3, t14);
    			if (if_block6) if_block6.m(div3, null);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			append_dev(div8, t18);
    			append_dev(div8, t19);
    			append_dev(div8, t20);
    			append_dev(div8, hr);
    			append_dev(div8, t21);
    			append_dev(div8, div7);
    			append_dev(div8, t23);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div8, null);
    			}

    			insert_dev(target, t24, anchor);
    			insert_dev(target, div19, anchor);
    			append_dev(div19, div18);
    			append_dev(div18, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div11, t26);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div11, null);
    			}

    			if (each1_else) {
    				each1_else.m(div11, null);
    			}

    			append_dev(div18, t27);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div15, t29);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div15, null);
    			}

    			if (each2_else) {
    				each2_else.m(div15, null);
    			}

    			insert_dev(target, t30, anchor);
    			insert_dev(target, div20, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*devobj*/ 4) && title_value !== (title_value = "" + (/*devobj*/ ctx[2].username.toUpperCase() + "'s Details"))) {
    				document.title = title_value;
    			}

    			if (/*devobj*/ ctx[2].portfolioweb != null) if_block0.p(ctx, dirty);
    			if (/*devobj*/ ctx[2].github != null) if_block1.p(ctx, dirty);
    			if (/*devobj*/ ctx[2].linkedinlink != null) if_block2.p(ctx, dirty);
    			if (/*devobj*/ ctx[2].tweetlink != null) if_block3.p(ctx, dirty);
    			if (/*devobj*/ ctx[2].fblink != null) if_block4.p(ctx, dirty);
    			if (/*devobj*/ ctx[2].instalink != null) if_block5.p(ctx, dirty);
    			if (/*devobj*/ ctx[2].youtubelink != null) if_block6.p(ctx, dirty);

    			if (dirty & /*devobj*/ 4) {
    				each_value_2 = /*devobj*/ ctx[2].skills.split(",");
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div8, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*devexps*/ 1) {
    				each_value_1 = /*devexps*/ ctx[0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div11, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;

    				if (each_value_1.length) {
    					if (each1_else) {
    						each1_else.d(1);
    						each1_else = null;
    					}
    				} else if (!each1_else) {
    					each1_else = create_else_block_1(ctx);
    					each1_else.c();
    					each1_else.m(div11, null);
    				}
    			}

    			if (dirty & /*devedus*/ 2) {
    				each_value = /*devedus*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div15, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;

    				if (each_value.length) {
    					if (each2_else) {
    						each2_else.d(1);
    						each2_else = null;
    					}
    				} else if (!each2_else) {
    					each2_else = create_else_block$2(ctx);
    					each2_else.c();
    					each2_else.m(div15, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div5);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(div9);
    			destroy_each(each_blocks_2, detaching);
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(div19);
    			destroy_each(each_blocks_1, detaching);
    			if (each1_else) each1_else.d();
    			destroy_each(each_blocks, detaching);
    			if (each2_else) each2_else.d();
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(div20);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DevDetails", slots, []);
    	const devobj = JSON.parse(sessionStorage.getItem("devdetail"));
    	let devid = devobj.user;
    	let devexps = [];
    	let devedus = [];

    	fetch("https://yashas.pythonanywhere.com/api/experiences/").then(res => res.json()).then(da => {
    		da.forEach(element => {
    			if (element.whose == devid) {
    				$$invalidate(0, devexps = [...devexps, element]);
    			}
    		});
    	});

    	fetch("https://yashas.pythonanywhere.com/api/educations/").then(res => res.json()).then(da => {
    		da.forEach(element => {
    			if (element.whose == devid) {
    				$$invalidate(1, devedus = [...devedus, element]);
    			}
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DevDetails> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Nav, devobj, devid, devexps, devedus });

    	$$self.$inject_state = $$props => {
    		if ("devid" in $$props) devid = $$props.devid;
    		if ("devexps" in $$props) $$invalidate(0, devexps = $$props.devexps);
    		if ("devedus" in $$props) $$invalidate(1, devedus = $$props.devedus);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [devexps, devedus, devobj];
    }

    class DevDetails extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DevDetails",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/Developers.svelte generated by Svelte v3.38.3 */
    const file$4 = "src/Developers.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (88:0) {:else}
    function create_else_block$1(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "progress-bar progress-bar-striped progress-bar-animated bg-info");
    			attr_dev(div0, "role", "progressbar");
    			attr_dev(div0, "aria-valuenow", "100");
    			attr_dev(div0, "aria-valuemin", "0");
    			attr_dev(div0, "aria-valuemax", "100");
    			set_style(div0, "width", "100%");
    			add_location(div0, file$4, 89, 4, 2549);
    			attr_dev(div1, "class", "progress container");
    			add_location(div1, file$4, 88, 2, 2511);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(88:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>    import Nav from './Nav.svelte'    import { onMount }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>    import Nav from './Nav.svelte'    import { onMount }",
    		ctx
    	});

    	return block;
    }

    // (62:8) {:then src}
    function create_then_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*src*/ ctx[6])) attr_dev(img, "src", img_src_value);
    			set_style(img, "max-width", "200px");
    			attr_dev(img, "class", "card-img rounded-circle mt-3");
    			attr_dev(img, "alt", "...");
    			add_location(img, file$4, 62, 10, 1672);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*devs*/ 1 && img.src !== (img_src_value = /*src*/ ctx[6])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(62:8) {:then src}",
    		ctx
    	});

    	return block;
    }

    // (56:28)             <img              src="https://yashas.pythonanywhere.com/static/img/profile-icon.png"              style="max-width:200px;"              class="card-img rounded-circle mt-3"              alt="..." />          {:then src}
    function create_pending_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "https://yashas.pythonanywhere.com/static/img/profile-icon.png")) attr_dev(img, "src", img_src_value);
    			set_style(img, "max-width", "200px");
    			attr_dev(img, "class", "card-img rounded-circle mt-3");
    			attr_dev(img, "alt", "...");
    			add_location(img, file$4, 56, 10, 1440);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(56:28)             <img              src=\\\"https://yashas.pythonanywhere.com/static/img/profile-icon.png\\\"              style=\\\"max-width:200px;\\\"              class=\\\"card-img rounded-circle mt-3\\\"              alt=\\\"...\\\" />          {:then src}",
    		ctx
    	});

    	return block;
    }

    // (52:0) {#each devs as dev}
    function create_each_block$1(ctx) {
    	let div5;
    	let div4;
    	let div1;
    	let promise;
    	let t0;
    	let div0;
    	let t1_value = /*dev*/ ctx[3].career + "";
    	let t1;
    	let t2;
    	let div3;
    	let div2;
    	let p0;
    	let t3_value = /*dev*/ ctx[3].username.toUpperCase() + "";
    	let t3;
    	let t4;
    	let p1;
    	let t5_value = /*dev*/ ctx[3].skills + "";
    	let t5;
    	let t6;
    	let hr;
    	let t7;
    	let p2;
    	let small;
    	let t8_value = /*dev*/ ctx[3].location + "";
    	let t8;
    	let t9;
    	let a;
    	let button;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 6
    	};

    	handle_promise(promise = gitfun(/*dev*/ ctx[3]), info);

    	function click_handler() {
    		return /*click_handler*/ ctx[1](/*dev*/ ctx[3]);
    	}

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			info.block.c();
    			t0 = space();
    			div0 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			p0 = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			p1 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			hr = element("hr");
    			t7 = space();
    			p2 = element("p");
    			small = element("small");
    			t8 = text(t8_value);
    			t9 = space();
    			a = element("a");
    			button = element("button");
    			button.textContent = "View Profile";
    			attr_dev(div0, "class", "text-center");
    			add_location(div0, file$4, 68, 8, 1837);
    			attr_dev(div1, "class", "col-md-4 text-center");
    			add_location(div1, file$4, 54, 6, 1364);
    			attr_dev(p0, "class", "card-text name svelte-85wqi2");
    			add_location(p0, file$4, 72, 10, 1981);
    			attr_dev(p1, "class", "text-muted mb-0 svelte-85wqi2");
    			add_location(p1, file$4, 73, 10, 2051);
    			add_location(hr, file$4, 74, 10, 2106);
    			attr_dev(small, "class", "text-muted svelte-85wqi2");
    			add_location(small, file$4, 76, 12, 2159);
    			attr_dev(p2, "class", "card-text");
    			add_location(p2, file$4, 75, 10, 2124);
    			attr_dev(button, "class", "btn btn-info");
    			add_location(button, file$4, 81, 12, 2380);
    			attr_dev(a, "href", "/devDetails");
    			add_location(a, file$4, 78, 10, 2235);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$4, 71, 8, 1946);
    			attr_dev(div3, "class", "col-md-8 text-center");
    			add_location(div3, file$4, 70, 6, 1902);
    			attr_dev(div4, "class", "row no-gutters");
    			add_location(div4, file$4, 53, 4, 1328);
    			attr_dev(div5, "class", "card mb-3 mx-auto svelte-85wqi2");
    			add_location(div5, file$4, 52, 2, 1291);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			info.block.m(div1, info.anchor = null);
    			info.mount = () => div1;
    			info.anchor = t0;
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(p0, t3);
    			append_dev(div2, t4);
    			append_dev(div2, p1);
    			append_dev(p1, t5);
    			append_dev(div2, t6);
    			append_dev(div2, hr);
    			append_dev(div2, t7);
    			append_dev(div2, p2);
    			append_dev(p2, small);
    			append_dev(small, t8);
    			append_dev(div2, t9);
    			append_dev(div2, a);
    			append_dev(a, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a, "click", click_handler, false, false, false),
    					action_destroyer(link.call(null, a))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*devs*/ 1 && promise !== (promise = gitfun(/*dev*/ ctx[3])) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}

    			if (dirty & /*devs*/ 1 && t1_value !== (t1_value = /*dev*/ ctx[3].career + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*devs*/ 1 && t3_value !== (t3_value = /*dev*/ ctx[3].username.toUpperCase() + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*devs*/ 1 && t5_value !== (t5_value = /*dev*/ ctx[3].skills + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*devs*/ 1 && t8_value !== (t8_value = /*dev*/ ctx[3].location + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			info.block.d();
    			info.token = null;
    			info = null;
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(52:0) {#each devs as dev}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let t0;
    	let nav;
    	let t1;
    	let h10;
    	let t3;
    	let h11;
    	let t5;
    	let t6;
    	let div;
    	let current;
    	nav = new Nav({ $$inline: true });
    	let each_value = /*devs*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$1(ctx);
    	}

    	const block = {
    		c: function create() {
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			h10 = element("h1");
    			h10.textContent = "Developers";
    			t3 = space();
    			h11 = element("h1");
    			h11.textContent = "Browse and connect with developers.";
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			t6 = space();
    			div = element("div");
    			document.title = "Our Developers";
    			attr_dev(h10, "class", "text-info text-center my-3");
    			add_location(h10, file$4, 48, 0, 1130);
    			attr_dev(h11, "class", "text-center mb-3 dev-noth svelte-85wqi2");
    			add_location(h11, file$4, 49, 0, 1186);
    			attr_dev(div, "class", "mb-5");
    			add_location(div, file$4, 99, 0, 2790);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h10, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h11, anchor);
    			insert_dev(target, t5, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			if (each_1_else) {
    				each_1_else.m(target, anchor);
    			}

    			insert_dev(target, t6, anchor);
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*sessionStorage, JSON, devs, gitfun*/ 1) {
    				each_value = /*devs*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t6.parentNode, t6);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;

    				if (each_value.length) {
    					if (each_1_else) {
    						each_1_else.d(1);
    						each_1_else = null;
    					}
    				} else if (!each_1_else) {
    					each_1_else = create_else_block$1(ctx);
    					each_1_else.c();
    					each_1_else.m(t6.parentNode, t6);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h10);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h11);
    			if (detaching) detach_dev(t5);
    			destroy_each(each_blocks, detaching);
    			if (each_1_else) each_1_else.d(detaching);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function gitfun(x) {
    	if (x.github == null) {
    		x.avatarurl = "https://yashas.pythonanywhere.com/static/img/profile-icon.png";
    		return "https://yashas.pythonanywhere.com/static/img/profile-icon.png";
    	}

    	let res = await fetch(`https://api.github.com/users/${x.github}`);
    	let resj = await res.json();
    	x.avatarurl = resj.avatar_url;

    	return res.ok
    	? resj.avatar_url
    	: "https://yashas.pythonanywhere.com/static/img/profile-icon.png";
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Developers", slots, []);
    	let devs = [];
    	let devnames = [];

    	onMount(async () => {
    		let res = await fetch("https://yashas.pythonanywhere.com/api/developers/");
    		$$invalidate(0, devs = await res.json());
    		window.console.log("New Update!");
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Developers> was created with unknown prop '${key}'`);
    	});

    	const click_handler = dev => sessionStorage.setItem("devdetail", JSON.stringify(dev));

    	$$self.$capture_state = () => ({
    		Nav,
    		onMount,
    		link,
    		devs,
    		devnames,
    		gitfun
    	});

    	$$self.$inject_state = $$props => {
    		if ("devs" in $$props) $$invalidate(0, devs = $$props.devs);
    		if ("devnames" in $$props) devnames = $$props.devnames;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [devs, click_handler];
    }

    class Developers extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Developers",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/Login.svelte generated by Svelte v3.38.3 */
    const file$3 = "src/Login.svelte";

    // (99:2) {#if state && !error}
    function create_if_block_1$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Logging In...";
    			set_style(div, "margin", "5px 0");
    			add_location(div, file$3, 99, 4, 2259);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(99:2) {#if state && !error}",
    		ctx
    	});

    	return block;
    }

    // (102:2) {#if error}
    function create_if_block$3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "LogIn Failed...";
    			set_style(div, "margin", "5px 0");
    			add_location(div, file$3, 102, 4, 2335);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(102:2) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let t0;
    	let nav;
    	let t1;
    	let div3;
    	let div0;
    	let t3;
    	let form;
    	let div1;
    	let input0;
    	let t4;
    	let div2;
    	let input1;
    	let t5;
    	let button;
    	let t7;
    	let span;
    	let t8;
    	let a;
    	let t10;
    	let t11;
    	let current;
    	let mounted;
    	let dispose;
    	nav = new Nav({ $$inline: true });
    	let if_block0 = /*state*/ ctx[2] && !/*error*/ ctx[3] && create_if_block_1$2(ctx);
    	let if_block1 = /*error*/ ctx[3] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Login Into Your Account";
    			t3 = space();
    			form = element("form");
    			div1 = element("div");
    			input0 = element("input");
    			t4 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Login";
    			t7 = space();
    			span = element("span");
    			t8 = text("Do not have an account?\r\n      ");
    			a = element("a");
    			a.textContent = "Register";
    			t10 = space();
    			if (if_block0) if_block0.c();
    			t11 = space();
    			if (if_block1) if_block1.c();
    			document.title = "Login into CC Account";
    			attr_dev(div0, "class", "cre my-4 svelte-5o7dqv");
    			add_location(div0, file$3, 72, 2, 1480);
    			attr_dev(input0, "placeholder", "Username");
    			attr_dev(input0, "class", "form-control text-lowercase");
    			attr_dev(input0, "id", "exampleInputEmail1");
    			attr_dev(input0, "aria-describedby", "emailHelp");
    			add_location(input0, file$3, 75, 6, 1579);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$3, 74, 4, 1547);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "Password");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "exampleInputPassword1");
    			add_location(input1, file$3, 83, 6, 1817);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$3, 82, 4, 1785);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-dark mr-2");
    			add_location(button, file$3, 90, 4, 1998);
    			attr_dev(a, "class", "text-info");
    			attr_dev(a, "href", "/register");
    			add_location(a, file$3, 95, 6, 2145);
    			attr_dev(span, "class", "svelte-5o7dqv");
    			add_location(span, file$3, 93, 4, 2100);
    			add_location(form, file$3, 73, 2, 1535);
    			attr_dev(div3, "class", "form svelte-5o7dqv");
    			set_style(div3, "max-width", "10in");
    			add_location(div3, file$3, 71, 0, 1434);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t3);
    			append_dev(div3, form);
    			append_dev(form, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, div2);
    			append_dev(div2, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t5);
    			append_dev(form, button);
    			append_dev(form, t7);
    			append_dev(form, span);
    			append_dev(span, t8);
    			append_dev(span, a);
    			append_dev(div3, t10);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t11);
    			if (if_block1) if_block1.m(div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(button, "click", /*loginfun*/ ctx[4], false, false, false),
    					action_destroyer(link.call(null, a))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*username*/ 1 && input0.value !== /*username*/ ctx[0]) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}

    			if (/*state*/ ctx[2] && !/*error*/ ctx[3]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_1$2(ctx);
    					if_block0.c();
    					if_block0.m(div3, t11);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*error*/ ctx[3]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Login", slots, []);

    	onMount(() => {
    		if (localStorage.getItem("username:authtoken") != null) {
    			push("/");
    		}
    	});

    	let username, password;
    	let state = false;
    	let error = false;

    	const loginfun = e => {
    		e.preventDefault();
    		$$invalidate(3, error = false);
    		$$invalidate(2, state = true);

    		fetch("https://yashas.pythonanywhere.com/api/token/", {
    			headers: { "Content-Type": "application/json" },
    			method: "POST",
    			body: JSON.stringify({
    				username: username.toLowerCase(),
    				password
    			})
    		}).then(res => res.json()).then(data => {
    			localStorage.setItem("username:authtoken", String(username.toLowerCase() + ":" + data.token));

    			if (data.token === undefined) {
    				localStorage.removeItem("username:authtoken");
    				$$invalidate(3, error = true);
    			} else {
    				$$invalidate(2, state = false);
    				push("/");
    			}
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({
    		Nav,
    		onMount,
    		push,
    		link,
    		username,
    		password,
    		state,
    		error,
    		loginfun
    	});

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    		if ("password" in $$props) $$invalidate(1, password = $$props.password);
    		if ("state" in $$props) $$invalidate(2, state = $$props.state);
    		if ("error" in $$props) $$invalidate(3, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		username,
    		password,
    		state,
    		error,
    		loginfun,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/Logout.svelte generated by Svelte v3.38.3 */

    function create_fragment$4(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Logout", slots, []);
    	window.localStorage.removeItem("username:authtoken");
    	window.localStorage.removeItem("userid");
    	push("/");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Logout> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ push });
    	return [];
    }

    class Logout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logout",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/Posts.svelte generated by Svelte v3.38.3 */
    const file$2 = "src/Posts.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (136:0) {#if addsuc}
    function create_if_block_2$1(ctx) {
    	let div;
    	let strong;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Success ->";
    			t1 = text("\r\n    Post Posted ;).");
    			add_location(strong, file$2, 137, 4, 3010);
    			attr_dev(div, "class", "alert alert-info svelte-2ethbr");
    			attr_dev(div, "role", "alert");
    			add_location(div, file$2, 136, 2, 2961);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(div, t1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(136:0) {#if addsuc}",
    		ctx
    	});

    	return block;
    }

    // (143:0) {#if delsuc}
    function create_if_block_1$1(ctx) {
    	let div;
    	let strong;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Success ->";
    			t1 = text("\r\n    Post Deleted ;).");
    			add_location(strong, file$2, 144, 4, 3144);
    			attr_dev(div, "class", "alert alert-info svelte-2ethbr");
    			attr_dev(div, "role", "alert");
    			add_location(div, file$2, 143, 2, 3095);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(div, t1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(143:0) {#if delsuc}",
    		ctx
    	});

    	return block;
    }

    // (189:2) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let div0;
    	let t;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			attr_dev(div0, "class", "progress-bar progress-bar-striped progress-bar-animated bg-info");
    			attr_dev(div0, "role", "progressbar");
    			attr_dev(div0, "aria-valuenow", "100");
    			attr_dev(div0, "aria-valuemin", "0");
    			attr_dev(div0, "aria-valuemax", "100");
    			set_style(div0, "width", "100%");
    			add_location(div0, file$2, 190, 6, 4511);
    			attr_dev(div1, "class", "progress container");
    			add_location(div1, file$2, 189, 4, 4471);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(189:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (172:8) {#if post.whose == localStorage.getItem('userid')}
    function create_if_block$2(ctx) {
    	let button;
    	let span;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[9](/*post*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$2, 177, 12, 4103);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$2, 172, 10, 3949);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, span);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(172:8) {#if post.whose == localStorage.getItem('userid')}",
    		ctx
    	});

    	return block;
    }

    // (168:2) {#each posts as post}
    function create_each_block(ctx) {
    	let div3;
    	let div2;
    	let show_if = /*post*/ ctx[11].whose == localStorage.getItem("userid");
    	let t0;
    	let div0;
    	let t1_value = /*post*/ ctx[11].username + "";
    	let t1;
    	let t2;
    	let h6;
    	let t3_value = /*post*/ ctx[11].text + "";
    	let t3;
    	let t4;
    	let div1;
    	let t5_value = /*dateformator*/ ctx[4](/*post*/ ctx[11].date) + "";
    	let t5;
    	let t6;
    	let if_block = show_if && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			h6 = element("h6");
    			t3 = text(t3_value);
    			t4 = space();
    			div1 = element("div");
    			t5 = text(t5_value);
    			t6 = space();
    			attr_dev(div0, "class", "card-title text-info font-weight-bold text-capitalize");
    			add_location(div0, file$2, 181, 8, 4190);
    			attr_dev(h6, "class", "card-subtitle");
    			add_location(h6, file$2, 184, 8, 4310);
    			attr_dev(div1, "class", "text-muted text-right svelte-2ethbr");
    			add_location(div1, file$2, 185, 8, 4362);
    			attr_dev(div2, "class", "card-body");
    			add_location(div2, file$2, 169, 6, 3852);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file$2, 168, 4, 3826);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, t1);
    			append_dev(div2, t2);
    			append_dev(div2, h6);
    			append_dev(h6, t3);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, t5);
    			append_dev(div3, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*posts*/ 1) show_if = /*post*/ ctx[11].whose == localStorage.getItem("userid");

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div2, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*posts*/ 1 && t1_value !== (t1_value = /*post*/ ctx[11].username + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*posts*/ 1 && t3_value !== (t3_value = /*post*/ ctx[11].text + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*posts*/ 1 && t5_value !== (t5_value = /*dateformator*/ ctx[4](/*post*/ ctx[11].date) + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(168:2) {#each posts as post}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let nav;
    	let t0;
    	let t1;
    	let t2;
    	let div5;
    	let div0;
    	let t4;
    	let div1;
    	let t6;
    	let div2;
    	let t8;
    	let div3;
    	let textarea;
    	let t9;
    	let button;
    	let t11;
    	let div4;
    	let t13;
    	let current;
    	let mounted;
    	let dispose;
    	nav = new Nav({ $$inline: true });
    	let if_block0 = /*addsuc*/ ctx[2] && create_if_block_2$1(ctx);
    	let if_block1 = /*delsuc*/ ctx[3] && create_if_block_1$1(ctx);
    	let each_value = /*posts*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			create_component(nav.$$.fragment);
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			div5 = element("div");
    			div0 = element("div");
    			div0.textContent = "Posts";
    			t4 = space();
    			div1 = element("div");
    			div1.textContent = "Welcome to the community!";
    			t6 = space();
    			div2 = element("div");
    			div2.textContent = "Create Post";
    			t8 = space();
    			div3 = element("div");
    			textarea = element("textarea");
    			t9 = space();
    			button = element("button");
    			button.textContent = "Post!";
    			t11 = space();
    			div4 = element("div");
    			div4.textContent = "Refresh";
    			t13 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			attr_dev(div0, "class", "dash text-info svelte-2ethbr");
    			add_location(div0, file$2, 150, 2, 3239);
    			attr_dev(div1, "class", "username mb-3 svelte-2ethbr");
    			add_location(div1, file$2, 151, 2, 3282);
    			attr_dev(div2, "class", "ss text-light bg-info p-1 svelte-2ethbr");
    			add_location(div2, file$2, 152, 2, 3344);
    			attr_dev(textarea, "rows", "4");
    			attr_dev(textarea, "class", "form-control mt-3 mb-2");
    			attr_dev(textarea, "placeholder", "Say Something...");
    			attr_dev(textarea, "aria-label", "With textarea");
    			add_location(textarea, file$2, 154, 4, 3435);
    			attr_dev(div3, "class", "input-group");
    			add_location(div3, file$2, 153, 2, 3404);
    			attr_dev(button, "class", "btn btn-outline-info mb-4 px-4");
    			add_location(button, file$2, 161, 2, 3612);
    			attr_dev(div4, "class", "text-right text-info mb-1 mr-1 svelte-2ethbr");
    			add_location(div4, file$2, 164, 2, 3706);
    			attr_dev(div5, "class", "content svelte-2ethbr");
    			add_location(div5, file$2, 149, 0, 3214);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(nav, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div5, t4);
    			append_dev(div5, div1);
    			append_dev(div5, t6);
    			append_dev(div5, div2);
    			append_dev(div5, t8);
    			append_dev(div5, div3);
    			append_dev(div3, textarea);
    			set_input_value(textarea, /*text*/ ctx[1]);
    			append_dev(div5, t9);
    			append_dev(div5, button);
    			append_dev(div5, t11);
    			append_dev(div5, div4);
    			append_dev(div5, t13);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div5, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(div5, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[8]),
    					listen_dev(button, "click", /*sendfun*/ ctx[6], false, false, false),
    					listen_dev(div4, "click", /*refreshfun*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*addsuc*/ ctx[2]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					if_block0.m(t1.parentNode, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*delsuc*/ ctx[3]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(t2.parentNode, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*text*/ 2) {
    				set_input_value(textarea, /*text*/ ctx[1]);
    			}

    			if (dirty & /*dateformator, posts, delfun, localStorage*/ 145) {
    				each_value = /*posts*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div5, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;

    				if (each_value.length) {
    					if (each_1_else) {
    						each_1_else.d(1);
    						each_1_else = null;
    					}
    				} else if (!each_1_else) {
    					each_1_else = create_else_block(ctx);
    					each_1_else.c();
    					each_1_else.m(div5, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks, detaching);
    			if (each_1_else) each_1_else.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Posts", slots, []);
    	let posts = [];
    	let d, text = "", addsuc = false, delsuc = false;

    	let dateformator = date => {
    		d = new Date(date);
    		return d.toLocaleDateString();
    	};

    	onMount(() => {
    		if (localStorage.getItem("username:authtoken") == null) {
    			push("/");
    		} else {
    			fetch("https://yashas.pythonanywhere.com/api/posts/", {
    				headers: {
    					Authorization: "Token " + localStorage.getItem("username:authtoken").split(":")[1]
    				}
    			}).then(res => res.json()).then(da => $$invalidate(0, posts = da.reverse()));
    		}
    	});

    	let refreshfun = () => {
    		fetch("https://yashas.pythonanywhere.com/api/posts/", {
    			headers: {
    				Authorization: "Token " + localStorage.getItem("username:authtoken").split(":")[1]
    			}
    		}).then(res => res.json()).then(da => $$invalidate(0, posts = da.reverse()));
    	};

    	let sendfun = () => {
    		if (text != "") {
    			fetch("https://yashas.pythonanywhere.com/api/posts/", {
    				method: "POST",
    				headers: {
    					"Content-Type": "application/json",
    					Authorization: "Token " + localStorage.getItem("username:authtoken").split(":")[1]
    				},
    				body: JSON.stringify({ text })
    			}).then(res => res).then(da => {
    				if (da.ok) {
    					refreshfun();
    					$$invalidate(1, text = "");
    					scrollTo(0, 0);
    					$$invalidate(2, addsuc = true);
    					window.setTimeout(() => $$invalidate(2, addsuc = false), 3000);
    				}
    			});
    		}
    	};

    	let delfun = i => {
    		fetch(`https://yashas.pythonanywhere.com/api/posts/${i}/`, {
    			method: "DELETE",
    			headers: {
    				Authorization: "Token " + localStorage.getItem("username:authtoken").split(":")[1]
    			}
    		}).then(res => res).then(da => {
    			if (da.ok) {
    				refreshfun();
    				scrollTo(0, 0);
    				$$invalidate(3, delsuc = true);
    				window.setTimeout(() => $$invalidate(3, delsuc = false), 3000);
    			}
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Posts> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		text = this.value;
    		$$invalidate(1, text);
    	}

    	const click_handler = post => delfun(post.id);

    	$$self.$capture_state = () => ({
    		Nav,
    		onMount,
    		push,
    		posts,
    		d,
    		text,
    		addsuc,
    		delsuc,
    		dateformator,
    		refreshfun,
    		sendfun,
    		delfun
    	});

    	$$self.$inject_state = $$props => {
    		if ("posts" in $$props) $$invalidate(0, posts = $$props.posts);
    		if ("d" in $$props) d = $$props.d;
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("addsuc" in $$props) $$invalidate(2, addsuc = $$props.addsuc);
    		if ("delsuc" in $$props) $$invalidate(3, delsuc = $$props.delsuc);
    		if ("dateformator" in $$props) $$invalidate(4, dateformator = $$props.dateformator);
    		if ("refreshfun" in $$props) $$invalidate(5, refreshfun = $$props.refreshfun);
    		if ("sendfun" in $$props) $$invalidate(6, sendfun = $$props.sendfun);
    		if ("delfun" in $$props) $$invalidate(7, delfun = $$props.delfun);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		posts,
    		text,
    		addsuc,
    		delsuc,
    		dateformator,
    		refreshfun,
    		sendfun,
    		delfun,
    		textarea_input_handler,
    		click_handler
    	];
    }

    class Posts extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Posts",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/ProfileEdit.svelte generated by Svelte v3.38.3 */

    const { document: document_1 } = globals;
    const file$1 = "src/ProfileEdit.svelte";

    // (120:0) {#if erroralert}
    function create_if_block_3(ctx) {
    	let div;
    	let strong;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Error -->";
    			t1 = text("\r\n    Oops something went wrong. Peace.");
    			add_location(strong, file$1, 127, 4, 3883);
    			attr_dev(div, "class", "alert alert-info svelte-mhp0c5");
    			attr_dev(div, "role", "alert");
    			add_location(div, file$1, 126, 2, 3834);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(div, t1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(120:0) {#if erroralert}",
    		ctx
    	});

    	return block;
    }

    // (133:0) {#if updatealert}
    function create_if_block_2(ctx) {
    	let div;
    	let strong;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "Profile Updated ->";
    			t1 = text("\r\n    You're developer profile is up to date.");
    			add_location(strong, file$1, 140, 4, 4348);
    			attr_dev(div, "class", "alert alert-info svelte-mhp0c5");
    			attr_dev(div, "role", "alert");
    			add_location(div, file$1, 139, 2, 4299);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, strong);
    			append_dev(div, t1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(133:0) {#if updatealert}",
    		ctx
    	});

    	return block;
    }

    // (253:2) {#if socnet}
    function create_if_block_1(ctx) {
    	let div5;
    	let div0;
    	let input0;
    	let t0;
    	let div1;
    	let input1;
    	let t1;
    	let div2;
    	let input2;
    	let t2;
    	let div3;
    	let input3;
    	let t3;
    	let div4;
    	let input4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t0 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t1 = space();
    			div2 = element("div");
    			input2 = element("input");
    			t2 = space();
    			div3 = element("div");
    			input3 = element("input");
    			t3 = space();
    			div4 = element("div");
    			input4 = element("input");
    			attr_dev(input0, "type", "url");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Your Twitter URL");
    			attr_dev(input0, "aria-label", "Username");
    			attr_dev(input0, "aria-describedby", "basic-addon1");
    			add_location(input0, file$1, 255, 8, 7585);
    			attr_dev(div0, "class", "input-group mb-2");
    			add_location(div0, file$1, 254, 6, 7545);
    			attr_dev(input1, "type", "url");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Your Instagram URL");
    			attr_dev(input1, "aria-label", "Username");
    			attr_dev(input1, "aria-describedby", "basic-addon1");
    			add_location(input1, file$1, 264, 8, 7858);
    			attr_dev(div1, "class", "input-group mb-2");
    			add_location(div1, file$1, 263, 6, 7818);
    			attr_dev(input2, "type", "url");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "placeholder", "Your Facebook URL");
    			attr_dev(input2, "aria-label", "Username");
    			attr_dev(input2, "aria-describedby", "basic-addon1");
    			add_location(input2, file$1, 273, 8, 8133);
    			attr_dev(div2, "class", "input-group mb-2");
    			add_location(div2, file$1, 272, 6, 8093);
    			attr_dev(input3, "type", "url");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "placeholder", "Your LinkedIn URL");
    			attr_dev(input3, "aria-label", "Username");
    			attr_dev(input3, "aria-describedby", "basic-addon1");
    			add_location(input3, file$1, 282, 8, 8404);
    			attr_dev(div3, "class", "input-group mb-2");
    			add_location(div3, file$1, 281, 6, 8364);
    			attr_dev(input4, "type", "url");
    			attr_dev(input4, "class", "form-control");
    			attr_dev(input4, "placeholder", "Your Youtube URL");
    			attr_dev(input4, "aria-label", "Username");
    			attr_dev(input4, "aria-describedby", "basic-addon1");
    			add_location(input4, file$1, 291, 8, 8681);
    			attr_dev(div4, "class", "input-group mb-2");
    			add_location(div4, file$1, 290, 6, 8641);
    			attr_dev(div5, "class", "socnet my-3");
    			add_location(div5, file$1, 253, 4, 7512);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*tweet*/ ctx[10]);
    			append_dev(div5, t0);
    			append_dev(div5, div1);
    			append_dev(div1, input1);
    			set_input_value(input1, /*insta*/ ctx[11]);
    			append_dev(div5, t1);
    			append_dev(div5, div2);
    			append_dev(div2, input2);
    			set_input_value(input2, /*fb*/ ctx[14]);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div3, input3);
    			set_input_value(input3, /*linkedin*/ ctx[13]);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, input4);
    			set_input_value(input4, /*yt*/ ctx[12]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[23]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[24]),
    					listen_dev(input2, "input", /*input2_input_handler_1*/ ctx[25]),
    					listen_dev(input3, "input", /*input3_input_handler_1*/ ctx[26]),
    					listen_dev(input4, "input", /*input4_input_handler_1*/ ctx[27])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tweet*/ 1024) {
    				set_input_value(input0, /*tweet*/ ctx[10]);
    			}

    			if (dirty & /*insta*/ 2048) {
    				set_input_value(input1, /*insta*/ ctx[11]);
    			}

    			if (dirty & /*fb*/ 16384) {
    				set_input_value(input2, /*fb*/ ctx[14]);
    			}

    			if (dirty & /*linkedin*/ 8192) {
    				set_input_value(input3, /*linkedin*/ ctx[13]);
    			}

    			if (dirty & /*yt*/ 4096) {
    				set_input_value(input4, /*yt*/ ctx[12]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(253:2) {#if socnet}",
    		ctx
    	});

    	return block;
    }

    // (307:2) {#if submittingtext}
    function create_if_block$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Submitting...";
    			attr_dev(div, "class", "text-info my-1");
    			add_location(div, file$1, 307, 4, 9123);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(307:2) {#if submittingtext}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let t0;
    	let nav;
    	let t1;
    	let t2;
    	let t3;
    	let div9;
    	let div0;
    	let t5;
    	let div1;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let t15;
    	let small0;
    	let t17;
    	let div2;
    	let input0;
    	let t18;
    	let small1;
    	let t20;
    	let div3;
    	let input1;
    	let t21;
    	let small2;
    	let t23;
    	let div4;
    	let input2;
    	let t24;
    	let small3;
    	let t26;
    	let div5;
    	let input3;
    	let t27;
    	let small4;
    	let t29;
    	let div6;
    	let input4;
    	let t30;
    	let small5;
    	let t32;
    	let div7;
    	let textarea;
    	let t33;
    	let small6;
    	let t35;
    	let button0;
    	let t37;
    	let span;
    	let t39;
    	let br;
    	let t40;
    	let t41;
    	let button1;
    	let t43;
    	let a;
    	let button2;
    	let t45;
    	let t46;
    	let div8;
    	let current;
    	let mounted;
    	let dispose;
    	nav = new Nav({ $$inline: true });
    	let if_block0 = /*erroralert*/ ctx[2] && create_if_block_3(ctx);
    	let if_block1 = /*updatealert*/ ctx[1] && create_if_block_2(ctx);
    	let if_block2 = /*socnet*/ ctx[0] && create_if_block_1(ctx);
    	let if_block3 = /*submittingtext*/ ctx[3] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			div9 = element("div");
    			div0 = element("div");
    			div0.textContent = "Edit/Create Your Profile";
    			t5 = space();
    			div1 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Select Your Professional Status";
    			option1 = element("option");
    			option1.textContent = "Developer";
    			option2 = element("option");
    			option2.textContent = "Senior Developer";
    			option3 = element("option");
    			option3.textContent = "Junior Developer";
    			option4 = element("option");
    			option4.textContent = "Manager";
    			option5 = element("option");
    			option5.textContent = "Student or Learning";
    			option6 = element("option");
    			option6.textContent = "Instructor or Teacher";
    			option7 = element("option");
    			option7.textContent = "Intern";
    			option8 = element("option");
    			option8.textContent = "Other";
    			t15 = space();
    			small0 = element("small");
    			small0.textContent = " Give us an idea of where you are at in your career.";
    			t17 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t18 = space();
    			small1 = element("small");
    			small1.textContent = " Could be your own company or one you work for.";
    			t20 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t21 = space();
    			small2 = element("small");
    			small2.textContent = " Could be your own portfolio or your company's website.";
    			t23 = space();
    			div4 = element("div");
    			input2 = element("input");
    			t24 = space();
    			small3 = element("small");
    			small3.textContent = " City & state suggested (eg. Bengaluru, Karnataka).";
    			t26 = space();
    			div5 = element("div");
    			input3 = element("input");
    			t27 = space();
    			small4 = element("small");
    			small4.textContent = " Please use commas(eg. Python,JavaScript).";
    			t29 = space();
    			div6 = element("div");
    			input4 = element("input");
    			t30 = space();
    			small5 = element("small");
    			small5.textContent = " If you want your Avatar and Github link to appear, Do include your\r\n    username.";
    			t32 = space();
    			div7 = element("div");
    			textarea = element("textarea");
    			t33 = space();
    			small6 = element("small");
    			small6.textContent = " Tell us a little about yourself.";
    			t35 = space();
    			button0 = element("button");
    			button0.textContent = "Add Social Network Skills";
    			t37 = space();
    			span = element("span");
    			span.textContent = "Optional";
    			t39 = space();
    			br = element("br");
    			t40 = space();
    			if (if_block2) if_block2.c();
    			t41 = space();
    			button1 = element("button");
    			button1.textContent = "Submit";
    			t43 = space();
    			a = element("a");
    			button2 = element("button");
    			button2.textContent = "Go Back";
    			t45 = space();
    			if (if_block3) if_block3.c();
    			t46 = space();
    			div8 = element("div");
    			document_1.title = "Edit your Profile";
    			attr_dev(div0, "class", "cre my-4 svelte-mhp0c5");
    			add_location(div0, file$1, 146, 2, 4495);
    			option0.selected = true;
    			option0.__value = "Select Your Professional Status";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 149, 6, 4644);
    			option1.__value = "Developer";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 150, 6, 4709);
    			option2.__value = "Senior Developer";
    			option2.value = option2.__value;
    			add_location(option2, file$1, 151, 6, 4743);
    			option3.__value = "Junior Developer";
    			option3.value = option3.__value;
    			add_location(option3, file$1, 152, 6, 4784);
    			option4.__value = "Manager";
    			option4.value = option4.__value;
    			add_location(option4, file$1, 153, 6, 4825);
    			option5.__value = "Student or Learning";
    			option5.value = option5.__value;
    			add_location(option5, file$1, 154, 6, 4857);
    			option6.__value = "Instructor or Teacher";
    			option6.value = option6.__value;
    			add_location(option6, file$1, 155, 6, 4901);
    			option7.__value = "Intern";
    			option7.value = option7.__value;
    			add_location(option7, file$1, 156, 6, 4947);
    			option8.__value = "Other";
    			option8.value = option8.__value;
    			add_location(option8, file$1, 157, 6, 4978);
    			attr_dev(select, "class", "custom-select");
    			attr_dev(select, "id", "inputGroupSelect01");
    			add_location(select, file$1, 148, 4, 4582);
    			attr_dev(div1, "class", "input-group");
    			add_location(div1, file$1, 147, 2, 4551);
    			attr_dev(small0, "id", "emailHelp");
    			attr_dev(small0, "class", "form-text text-muted mb-3");
    			add_location(small0, file$1, 160, 2, 5029);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Company Name");
    			attr_dev(input0, "aria-label", "Username");
    			attr_dev(input0, "aria-describedby", "basic-addon1");
    			add_location(input0, file$1, 165, 4, 5197);
    			attr_dev(div2, "class", "input-group");
    			add_location(div2, file$1, 164, 2, 5166);
    			attr_dev(small1, "id", "emailHelp");
    			attr_dev(small1, "class", "form-text text-muted mb-3");
    			add_location(small1, file$1, 174, 2, 5399);
    			attr_dev(input1, "type", "url");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Website");
    			attr_dev(input1, "aria-label", "Username");
    			attr_dev(input1, "aria-describedby", "basic-addon1");
    			add_location(input1, file$1, 179, 4, 5562);
    			attr_dev(div3, "class", "input-group");
    			add_location(div3, file$1, 178, 2, 5531);
    			attr_dev(small2, "id", "emailHelp");
    			attr_dev(small2, "class", "form-text text-muted mb-3");
    			add_location(small2, file$1, 188, 2, 5758);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "placeholder", "Location");
    			attr_dev(input2, "aria-label", "Username");
    			attr_dev(input2, "aria-describedby", "basic-addon1");
    			add_location(input2, file$1, 193, 4, 5929);
    			attr_dev(div4, "class", "input-group");
    			add_location(div4, file$1, 192, 2, 5898);
    			attr_dev(small3, "id", "emailHelp");
    			attr_dev(small3, "class", "form-text text-muted mb-3");
    			add_location(small3, file$1, 202, 2, 6128);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "placeholder", "Skills");
    			attr_dev(input3, "aria-label", "Username");
    			attr_dev(input3, "aria-describedby", "basic-addon1");
    			add_location(input3, file$1, 207, 4, 6295);
    			attr_dev(div5, "class", "input-group");
    			add_location(div5, file$1, 206, 2, 6264);
    			attr_dev(small4, "id", "emailHelp");
    			attr_dev(small4, "class", "form-text text-muted mb-3");
    			add_location(small4, file$1, 216, 2, 6490);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "class", "form-control");
    			attr_dev(input4, "placeholder", "GitHub Username");
    			attr_dev(input4, "aria-label", "Username");
    			attr_dev(input4, "aria-describedby", "basic-addon1");
    			add_location(input4, file$1, 221, 4, 6648);
    			attr_dev(div6, "class", "input-group");
    			add_location(div6, file$1, 220, 2, 6617);
    			attr_dev(small5, "id", "emailHelp");
    			attr_dev(small5, "class", "form-text text-muted mb-3");
    			add_location(small5, file$1, 230, 2, 6860);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "placeholder", "A short bio of yourself.");
    			attr_dev(textarea, "aria-label", "With textarea");
    			add_location(textarea, file$1, 236, 4, 7058);
    			attr_dev(div7, "class", "input-group");
    			add_location(div7, file$1, 235, 2, 7027);
    			attr_dev(small6, "id", "emailHelp");
    			attr_dev(small6, "class", "form-text text-muted mb-3");
    			add_location(small6, file$1, 242, 2, 7216);
    			attr_dev(button0, "class", "btn btn-secondary mr-4");
    			add_location(button0, file$1, 246, 2, 7334);
    			add_location(span, file$1, 249, 2, 7457);
    			add_location(br, file$1, 250, 2, 7482);
    			attr_dev(button1, "class", "btn btn-info mt-4");
    			add_location(button1, file$1, 302, 2, 8930);
    			attr_dev(button2, "class", "btn btn-light mt-4 ml-2");
    			add_location(button2, file$1, 304, 4, 9029);
    			attr_dev(a, "href", "/");
    			add_location(a, file$1, 303, 2, 9002);
    			attr_dev(div8, "class", "my-5");
    			add_location(div8, file$1, 309, 2, 9183);
    			attr_dev(div9, "class", "form svelte-mhp0c5");
    			set_style(div9, "max-width", "10in");
    			add_location(div9, file$1, 145, 0, 4449);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div0);
    			append_dev(div9, t5);
    			append_dev(div9, div1);
    			append_dev(div1, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);
    			append_dev(select, option5);
    			append_dev(select, option6);
    			append_dev(select, option7);
    			append_dev(select, option8);
    			append_dev(div9, t15);
    			append_dev(div9, small0);
    			append_dev(div9, t17);
    			append_dev(div9, div2);
    			append_dev(div2, input0);
    			set_input_value(input0, /*company*/ ctx[4]);
    			append_dev(div9, t18);
    			append_dev(div9, small1);
    			append_dev(div9, t20);
    			append_dev(div9, div3);
    			append_dev(div3, input1);
    			set_input_value(input1, /*website*/ ctx[5]);
    			append_dev(div9, t21);
    			append_dev(div9, small2);
    			append_dev(div9, t23);
    			append_dev(div9, div4);
    			append_dev(div4, input2);
    			set_input_value(input2, /*location*/ ctx[6]);
    			append_dev(div9, t24);
    			append_dev(div9, small3);
    			append_dev(div9, t26);
    			append_dev(div9, div5);
    			append_dev(div5, input3);
    			set_input_value(input3, /*skills*/ ctx[7]);
    			append_dev(div9, t27);
    			append_dev(div9, small4);
    			append_dev(div9, t29);
    			append_dev(div9, div6);
    			append_dev(div6, input4);
    			set_input_value(input4, /*githubUsername*/ ctx[8]);
    			append_dev(div9, t30);
    			append_dev(div9, small5);
    			append_dev(div9, t32);
    			append_dev(div9, div7);
    			append_dev(div7, textarea);
    			set_input_value(textarea, /*bio*/ ctx[9]);
    			append_dev(div9, t33);
    			append_dev(div9, small6);
    			append_dev(div9, t35);
    			append_dev(div9, button0);
    			append_dev(div9, t37);
    			append_dev(div9, span);
    			append_dev(div9, t39);
    			append_dev(div9, br);
    			append_dev(div9, t40);
    			if (if_block2) if_block2.m(div9, null);
    			append_dev(div9, t41);
    			append_dev(div9, button1);
    			append_dev(div9, t43);
    			append_dev(div9, a);
    			append_dev(a, button2);
    			append_dev(div9, t45);
    			if (if_block3) if_block3.m(div9, null);
    			append_dev(div9, t46);
    			append_dev(div9, div8);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[16]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[17]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[18]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[19]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[20]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[21]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[22], false, false, false),
    					listen_dev(button1, "click", /*sendfun*/ ctx[15], false, false, false),
    					action_destroyer(link.call(null, a))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*erroralert*/ ctx[2]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(t2.parentNode, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*updatealert*/ ctx[1]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(t3.parentNode, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*company*/ 16 && input0.value !== /*company*/ ctx[4]) {
    				set_input_value(input0, /*company*/ ctx[4]);
    			}

    			if (dirty & /*website*/ 32) {
    				set_input_value(input1, /*website*/ ctx[5]);
    			}

    			if (dirty & /*location*/ 64 && input2.value !== /*location*/ ctx[6]) {
    				set_input_value(input2, /*location*/ ctx[6]);
    			}

    			if (dirty & /*skills*/ 128 && input3.value !== /*skills*/ ctx[7]) {
    				set_input_value(input3, /*skills*/ ctx[7]);
    			}

    			if (dirty & /*githubUsername*/ 256 && input4.value !== /*githubUsername*/ ctx[8]) {
    				set_input_value(input4, /*githubUsername*/ ctx[8]);
    			}

    			if (dirty & /*bio*/ 512) {
    				set_input_value(textarea, /*bio*/ ctx[9]);
    			}

    			if (/*socnet*/ ctx[0]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div9, t41);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*submittingtext*/ ctx[3]) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block$1(ctx);
    					if_block3.c();
    					if_block3.m(div9, t46);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div9);
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ProfileEdit", slots, []);
    	let socnet = false;
    	let updatealert = false, erroralert = false, submittingtext = false;

    	let selectedcareer = "",
    		company = "",
    		website = "",
    		location = "",
    		skills = "",
    		githubUsername = null,
    		bio = null,
    		tweet = null,
    		insta = null,
    		yt = null,
    		linkedin = null,
    		fb = null;

    	onMount(() => {
    		// Since it was unable to bind the value as such.
    		selectedcareer = document.getElementById("inputGroupSelect01");

    		fetch(`https://yashas.pythonanywhere.com/api/developers/${localStorage.getItem("userid")}/`).then(res => res.json()).then(da => {
    			selectedcareer.options[selectedcareer.selectedIndex].text = da.career == undefined
    			? "Select Your Professional Status"
    			: da.career;

    			$$invalidate(4, company = da.company == undefined ? "" : da.company);
    			$$invalidate(5, website = da.portfolioweb == undefined ? "" : da.portfolioweb);
    			$$invalidate(6, location = da.location == undefined ? "" : da.location);
    			$$invalidate(7, skills = da.skills == undefined ? "" : da.skills);
    			$$invalidate(9, bio = da.bio == undefined ? null : da.bio);
    			$$invalidate(8, githubUsername = da.github == undefined ? null : da.github);
    			$$invalidate(13, linkedin = da.linkedinlink == undefined ? null : da.linkedinlink);
    			$$invalidate(10, tweet = da.tweetlink == undefined ? null : da.tweetlink);
    			$$invalidate(14, fb = da.fblink == undefined ? null : da.fblink);
    			$$invalidate(12, yt = da.youtubelink == undefined ? null : da.youtubelink);
    			$$invalidate(11, insta = da.instalink == undefined ? null : da.instalink);
    		});
    	});

    	let sendfun = () => {
    		$$invalidate(3, submittingtext = true);

    		//console.log(selectedcareer.options[selectedcareer.selectedIndex].text,company,website,location,skills,githubUsername,bio,tweet,insta,yt,linkedin,fb)
    		fetch("https://yashas.pythonanywhere.com/api/developers/", {
    			headers: {
    				"Content-Type": "application/json",
    				Authorization: "Token " + localStorage.getItem("username:authtoken").split(":")[1]
    			},
    			method: "POST",
    			body: JSON.stringify({
    				career: selectedcareer.options[selectedcareer.selectedIndex].text,
    				company,
    				portfolioweb: website,
    				location,
    				skills,
    				bio,
    				github: githubUsername == "" ? null : githubUsername,
    				linkedinlink: linkedin == "" ? null : linkedin,
    				tweetlink: tweet == "" ? null : tweet,
    				fblink: fb == "" ? null : fb,
    				instalink: insta == "" ? null : insta,
    				youtubelink: yt == "" ? null : yt,
    				username: localStorage.getItem("username:authtoken").split(":")[0]
    			})
    		}).then(res => res).then(da => {
    			da.ok
    			? $$invalidate(1, updatealert = true)
    			: $$invalidate(2, erroralert = true);

    			$$invalidate(3, submittingtext = false);

    			window.setTimeout(
    				() => {
    					$$invalidate(2, erroralert = false);
    					$$invalidate(1, updatealert = false);
    				},
    				3000
    			);

    			window.scrollTo(0, 0);
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProfileEdit> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		company = this.value;
    		$$invalidate(4, company);
    	}

    	function input1_input_handler() {
    		website = this.value;
    		$$invalidate(5, website);
    	}

    	function input2_input_handler() {
    		location = this.value;
    		$$invalidate(6, location);
    	}

    	function input3_input_handler() {
    		skills = this.value;
    		$$invalidate(7, skills);
    	}

    	function input4_input_handler() {
    		githubUsername = this.value;
    		$$invalidate(8, githubUsername);
    	}

    	function textarea_input_handler() {
    		bio = this.value;
    		$$invalidate(9, bio);
    	}

    	const click_handler = () => $$invalidate(0, socnet = !socnet);

    	function input0_input_handler_1() {
    		tweet = this.value;
    		$$invalidate(10, tweet);
    	}

    	function input1_input_handler_1() {
    		insta = this.value;
    		$$invalidate(11, insta);
    	}

    	function input2_input_handler_1() {
    		fb = this.value;
    		$$invalidate(14, fb);
    	}

    	function input3_input_handler_1() {
    		linkedin = this.value;
    		$$invalidate(13, linkedin);
    	}

    	function input4_input_handler_1() {
    		yt = this.value;
    		$$invalidate(12, yt);
    	}

    	$$self.$capture_state = () => ({
    		Nav,
    		onMount,
    		link,
    		socnet,
    		updatealert,
    		erroralert,
    		submittingtext,
    		selectedcareer,
    		company,
    		website,
    		location,
    		skills,
    		githubUsername,
    		bio,
    		tweet,
    		insta,
    		yt,
    		linkedin,
    		fb,
    		sendfun
    	});

    	$$self.$inject_state = $$props => {
    		if ("socnet" in $$props) $$invalidate(0, socnet = $$props.socnet);
    		if ("updatealert" in $$props) $$invalidate(1, updatealert = $$props.updatealert);
    		if ("erroralert" in $$props) $$invalidate(2, erroralert = $$props.erroralert);
    		if ("submittingtext" in $$props) $$invalidate(3, submittingtext = $$props.submittingtext);
    		if ("selectedcareer" in $$props) selectedcareer = $$props.selectedcareer;
    		if ("company" in $$props) $$invalidate(4, company = $$props.company);
    		if ("website" in $$props) $$invalidate(5, website = $$props.website);
    		if ("location" in $$props) $$invalidate(6, location = $$props.location);
    		if ("skills" in $$props) $$invalidate(7, skills = $$props.skills);
    		if ("githubUsername" in $$props) $$invalidate(8, githubUsername = $$props.githubUsername);
    		if ("bio" in $$props) $$invalidate(9, bio = $$props.bio);
    		if ("tweet" in $$props) $$invalidate(10, tweet = $$props.tweet);
    		if ("insta" in $$props) $$invalidate(11, insta = $$props.insta);
    		if ("yt" in $$props) $$invalidate(12, yt = $$props.yt);
    		if ("linkedin" in $$props) $$invalidate(13, linkedin = $$props.linkedin);
    		if ("fb" in $$props) $$invalidate(14, fb = $$props.fb);
    		if ("sendfun" in $$props) $$invalidate(15, sendfun = $$props.sendfun);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		socnet,
    		updatealert,
    		erroralert,
    		submittingtext,
    		company,
    		website,
    		location,
    		skills,
    		githubUsername,
    		bio,
    		tweet,
    		insta,
    		yt,
    		linkedin,
    		fb,
    		sendfun,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		textarea_input_handler,
    		click_handler,
    		input0_input_handler_1,
    		input1_input_handler_1,
    		input2_input_handler_1,
    		input3_input_handler_1,
    		input4_input_handler_1
    	];
    }

    class ProfileEdit extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProfileEdit",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Register.svelte generated by Svelte v3.38.3 */
    const file = "src/Register.svelte";

    // (91:0) {#if createdalert}
    function create_if_block(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*alerttext*/ ctx[5]);
    			attr_dev(div, "class", "alert alert-info svelte-18dluxa");
    			attr_dev(div, "role", "alert");
    			add_location(div, file, 91, 2, 2067);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*alerttext*/ 32) set_data_dev(t, /*alerttext*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(91:0) {#if createdalert}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let nav;
    	let t1;
    	let t2;
    	let div5;
    	let div0;
    	let t4;
    	let div1;
    	let input0;
    	let t5;
    	let small0;
    	let t7;
    	let div2;
    	let input1;
    	let t8;
    	let small1;
    	let t10;
    	let div3;
    	let input2;
    	let t11;
    	let div4;
    	let input3;
    	let t12;
    	let button;
    	let t14;
    	let span;
    	let t15;
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	nav = new Nav({ $$inline: true });
    	let if_block = /*createdalert*/ ctx[4] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			create_component(nav.$$.fragment);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			div5 = element("div");
    			div0 = element("div");
    			div0.textContent = "Create Your Account";
    			t4 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t5 = space();
    			small0 = element("small");
    			small0.textContent = "Username must be one word.";
    			t7 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t8 = space();
    			small1 = element("small");
    			small1.textContent = "We'll never share your email with anyone else.";
    			t10 = space();
    			div3 = element("div");
    			input2 = element("input");
    			t11 = space();
    			div4 = element("div");
    			input3 = element("input");
    			t12 = space();
    			button = element("button");
    			button.textContent = "Register";
    			t14 = space();
    			span = element("span");
    			t15 = text("Already have an account?\r\n    ");
    			a = element("a");
    			a.textContent = "Log In";
    			document.title = "Register to CodeConnector";
    			attr_dev(div0, "class", "cre my-4 svelte-18dluxa");
    			add_location(div0, file, 94, 2, 2182);
    			attr_dev(input0, "placeholder", "Username");
    			attr_dev(input0, "class", "form-control text-lowercase");
    			attr_dev(input0, "id", "exampleInputEmail1");
    			attr_dev(input0, "aria-describedby", "emailHelp");
    			add_location(input0, file, 96, 4, 2263);
    			attr_dev(small0, "id", "emailHelp");
    			attr_dev(small0, "class", "form-text text-muted");
    			add_location(small0, file, 102, 4, 2447);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file, 95, 2, 2233);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "placeholder", "Email");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "exampleInputEmail2");
    			attr_dev(input1, "aria-describedby", "emailHelp");
    			add_location(input1, file, 107, 4, 2590);
    			attr_dev(small1, "id", "emailHelp");
    			attr_dev(small1, "class", "form-text text-muted");
    			add_location(small1, file, 114, 4, 2773);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file, 106, 2, 2560);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "placeholder", "Password");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "id", "exampleInputPassword1");
    			add_location(input2, file, 119, 4, 2936);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file, 118, 2, 2906);
    			attr_dev(input3, "type", "password");
    			attr_dev(input3, "placeholder", "Confirm Password");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "id", "exampleInputPassword2");
    			add_location(input3, file, 127, 4, 3134);
    			attr_dev(div4, "class", "form-group");
    			add_location(div4, file, 126, 2, 3104);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-dark mr-2");
    			add_location(button, file, 134, 2, 3310);
    			attr_dev(a, "class", "text-info");
    			attr_dev(a, "href", "/login");
    			add_location(a, file, 139, 4, 3454);
    			attr_dev(span, "class", "svelte-18dluxa");
    			add_location(span, file, 137, 2, 3412);
    			attr_dev(div5, "class", "form svelte-18dluxa");
    			set_style(div5, "max-width", "10in");
    			add_location(div5, file, 93, 0, 2136);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(nav, target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div5, t4);
    			append_dev(div5, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append_dev(div1, t5);
    			append_dev(div1, small0);
    			append_dev(div5, t7);
    			append_dev(div5, div2);
    			append_dev(div2, input1);
    			set_input_value(input1, /*email*/ ctx[2]);
    			append_dev(div2, t8);
    			append_dev(div2, small1);
    			append_dev(div5, t10);
    			append_dev(div5, div3);
    			append_dev(div3, input2);
    			set_input_value(input2, /*password1*/ ctx[1]);
    			append_dev(div5, t11);
    			append_dev(div5, div4);
    			append_dev(div4, input3);
    			set_input_value(input3, /*password2*/ ctx[3]);
    			append_dev(div5, t12);
    			append_dev(div5, button);
    			append_dev(div5, t14);
    			append_dev(div5, span);
    			append_dev(span, t15);
    			append_dev(span, a);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[8]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[9]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[10]),
    					listen_dev(button, "click", /*registerfun*/ ctx[6], false, false, false),
    					action_destroyer(link.call(null, a))
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*createdalert*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(t2.parentNode, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*username*/ 1 && input0.value !== /*username*/ ctx[0]) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty & /*email*/ 4 && input1.value !== /*email*/ ctx[2]) {
    				set_input_value(input1, /*email*/ ctx[2]);
    			}

    			if (dirty & /*password1*/ 2 && input2.value !== /*password1*/ ctx[1]) {
    				set_input_value(input2, /*password1*/ ctx[1]);
    			}

    			if (dirty & /*password2*/ 8 && input3.value !== /*password2*/ ctx[3]) {
    				set_input_value(input3, /*password2*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Register", slots, []);

    	onMount(() => {
    		if (localStorage.getItem("username:authtoken") != null) {
    			push("/");
    		}
    	});

    	let username = "";
    	let password1 = "";
    	let email = "";
    	let password2 = "";
    	let createdalert = false;
    	let alerttext = "";

    	let registerfun = () => {
    		if (username != "" && password2 != "" && email != "" && password1 == password2 && email.includes("@") && email.includes(".")) {
    			fetch("https://yashas.pythonanywhere.com/api/users/", {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify({
    					username: username.toLowerCase(),
    					email,
    					password: password2
    				})
    			}).then(res => {
    				if (res.ok) {
    					$$invalidate(0, username = "");
    					$$invalidate(3, password2 = "");
    					$$invalidate(1, password1 = "");
    					$$invalidate(2, email = "");
    					$$invalidate(4, createdalert = true);
    					$$invalidate(5, alerttext = "Account Registered --> You're now part of CodeConnector");
    					setTimeout(() => navigate("/login"), 2000);
    				} else {
    					$$invalidate(4, createdalert = true);
    					$$invalidate(5, alerttext = "It looks like this username is already taken :'( ");
    					setTimeout(() => $$invalidate(4, createdalert = false), 3000);
    				}
    			});
    		} else {
    			$$invalidate(4, createdalert = true);
    			$$invalidate(5, alerttext = "Either the passwords didn't match or the email is faked.");
    			setTimeout(() => $$invalidate(4, createdalert = false), 3000);
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Register> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		email = this.value;
    		$$invalidate(2, email);
    	}

    	function input2_input_handler() {
    		password1 = this.value;
    		$$invalidate(1, password1);
    	}

    	function input3_input_handler() {
    		password2 = this.value;
    		$$invalidate(3, password2);
    	}

    	$$self.$capture_state = () => ({
    		Nav,
    		onMount,
    		push,
    		link,
    		username,
    		password1,
    		email,
    		password2,
    		createdalert,
    		alerttext,
    		registerfun
    	});

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    		if ("password1" in $$props) $$invalidate(1, password1 = $$props.password1);
    		if ("email" in $$props) $$invalidate(2, email = $$props.email);
    		if ("password2" in $$props) $$invalidate(3, password2 = $$props.password2);
    		if ("createdalert" in $$props) $$invalidate(4, createdalert = $$props.createdalert);
    		if ("alerttext" in $$props) $$invalidate(5, alerttext = $$props.alerttext);
    		if ("registerfun" in $$props) $$invalidate(6, registerfun = $$props.registerfun);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		username,
    		password1,
    		email,
    		password2,
    		createdalert,
    		alerttext,
    		registerfun,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler
    	];
    }

    class Register extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Register",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.3 */

    function create_fragment(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	const routes = {
    		"/": Index,
    		"/addEdu": AddEdu,
    		"/addExp": AddExp,
    		"/devDetails": DevDetails,
    		"/developers": Developers,
    		"/login": Login,
    		"/logout": Logout,
    		"/posts": Posts,
    		"/profileEdit": ProfileEdit,
    		"/register": Register
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		Index,
    		AddEdu,
    		AddExp,
    		DevDetails,
    		Developers,
    		Login,
    		Logout,
    		Posts,
    		ProfileEdit,
    		Register,
    		routes
    	});

    	return [routes];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
