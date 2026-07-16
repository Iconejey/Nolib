/**
 * Async delay function that resolves after a specified timeout
 * @param {number} ms - Time in milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 * @example
 * await delay(1000); // Waits for 1 second
 */
function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
