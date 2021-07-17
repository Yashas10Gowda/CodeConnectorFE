import App from './App.svelte';

const app = new App({
	target: document.body
});

const originalSetItem = localStorage.setItem;

localStorage.setItem = function(key, value) {
	const event = new Event('itemInserted');

	event.value = value; // Optional..
	event.key = key; // Optional..

	document.dispatchEvent(event);

	originalSetItem.apply(this, arguments);
};

const originalRemoveItem = localStorage.removeItem;

localStorage.removeItem = function(key, value) {
	const event = new Event('itemRemoved');
	document.dispatchEvent(event);

	originalRemoveItem.apply(this, arguments);
};

export default app;