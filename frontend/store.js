class STORE {
	static socket = null;
	static subscribtions = {};

	static sub(elem, file_path, key_func, callback) {
		// Add the subscription
		(API.subscribtions[file_path] ||= []).push({
			value: undefined,
			key_func,
			callback
		});

		// If the element is removed, clean up the subscription
		elem?.onRemove(() => {
			API.subscribtions[file_path] = API.subscribtions[file_path].filter(cb => cb !== callback);
		});
	}

	static init() {
		API.socket = new WebSocket('wss://api.example.com/socket');

		// On message received
		API.socket.onmessage = event => {
			// Get the file path and data from the message
			const { file_path, data } = JSON.parse(event.data);

			// For each subscription for this file path
			for (const subscription of API.subscribtions[file_path] || []) {
				// Get the new value using the key function
				const new_value = subscription.key_func?.(data) || data;

				// If the value has changed, call the callback
				if (subscription.value !== new_value) {
					subscription.value = new_value;
					subscription.callback?.(new_value);
				}
			}
		};
	}
}
