// ---------- Query Selector Utilities ----------

/**
 * Shorthand for document.querySelector - returns the first element that matches the CSS selector
 * @param {string} selector - CSS selector string to match elements
 * @returns {Element|null} The first matching element or null if no match found
 * @example
 * // Select element by ID
 * const header = $('#header');
 *
 * // Select element by class
 * const button = $('.submit-btn');
 *
 * // Select by complex selector
 * const input = $('form input[type="email"]');
 */
function $(selector) {
	return document.querySelector(selector);
}

/**
 * Shorthand for document.querySelectorAll - returns all elements that match the CSS selector
 * @param {string} selector - CSS selector string to match elements
 * @returns {NodeList} A NodeList containing all matching elements
 * @example
 * // Select all elements with a class
 * const buttons = $$('.btn');
 *
 * // Select all list items
 * const items = $$('li');
 *
 * // Convert to array and use array methods
 * const itemsArray = Array.from($$('.item'));
 */
function $$(selector) {
	return document.querySelectorAll(selector);
}

/**
 * Extends HTMLElement prototype with $ property for scoped querySelector
 * Allows any HTMLElement to use the $ method to query within itself
 * @memberof HTMLElement.prototype
 * @type {function}
 * @param {string} selector - CSS selector string to match child elements
 * @returns {Element|null} The first matching child element or null
 * @example
 * const container = $('#container');
 * const childButton = container.$('.child-button');
 */
Object.defineProperty(HTMLElement.prototype, '$', {
	get() {
		return this.querySelector.bind(this);
	}
});

/**
 * Extends HTMLElement prototype with $$ property for scoped querySelectorAll
 * Allows any HTMLElement to use the $$ method to query all matching children
 * @memberof HTMLElement.prototype
 * @type {function}
 * @param {string} selector - CSS selector string to match child elements
 * @returns {NodeList} A NodeList containing all matching child elements
 * @example
 * const form = $('#myForm');
 * const inputs = form.$$('input');
 */
Object.defineProperty(HTMLElement.prototype, '$$', {
	get() {
		return this.querySelectorAll.bind(this);
	}
});

// ---------- Template String Tags ----------
/**
 * Default tag function for constructing raw strings from template literals
 * @param {TemplateStringsArray} strings - Template strings array
 * @param  {...any} values - Values to interpolate into the template
 * @returns {string} The final string
 */
function raw(strings, ...values) {
	return strings.reduce((result, str, i) => result + str + (i < values.length ? values[i] : ''), '');
}

/**
 * Handle html strings and allow self closing custom component tags
 * @param {TemplateStringsArray} strings - Template strings array
 * @param  {...any} values - Values to interpolate into the template
 * @returns {string} The final HTML string
 */
function html(strings, ...values) {
	return raw(strings, ...values).replaceAll(/<(\w+-[\w-]+)[^>]*\/>/gm, (match, tag) => match.replace('/>', `></${tag}>`));
}

/**
 * Base class for creating custom HTML components
 * Extends HTMLElement and provides lifecycle methods
 * @class
 * @extends HTMLElement
 */
class CustomComponent extends HTMLElement {
	static defined = false;

	static get tag() {
		return this.name
			?.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
			.replace(/([a-z\d])([A-Z])/g, '$1-$2')
			.toLowerCase();
	}

	static get observedAttributes() {
		return ['class'];
	}

	attributeChangedCallback(name, old_value, new_value) {
		if (name !== 'class') return;

		for (const [class_name, onChange] of this.watched_classes) {
			const was_present = old_value?.includes(class_name);
			const is_present = new_value?.includes(class_name);
			if (was_present !== is_present) onChange(is_present);
		}
	}

	constructor() {
		super();

		// Watched classes
		this.watched_classes = [];

		// Global event listeners
		this.global_listeners = [];

		// Create getters for each selector in class static selectors attribute
		for (const prop in this.constructor.selectors || {}) {
			const selector = this.constructor.selectors[prop];

			// Multiple elements
			if (prop.startsWith('$$')) {
				Object.defineProperty(this, prop, {
					get: () => this.$$(selector)
				});
			}

			// Single element
			else {
				Object.defineProperty(this, prop, {
					get: () => this.$(selector)
				});
			}
		}
	}

	/**
	 * Defines a reactive state with default value
	 * @param {string} state_name - Name of the state
	 * @param {any} default_value - Default value for the state
	 */
	setState(state_name, default_value, onChange = null) {
		// If onchange is an element, bind to its textContent
		if (onChange instanceof HTMLElement) {
			const element = onChange;
			onChange = value => {
				element.textContent = value;
			};
		}

		let state_value;

		// Define getter and setter
		Object.defineProperty(this, state_name, {
			get: () => state_value,
			set: value => {
				state_value = value;
				onChange?.(value);
			}
		});

		// If default value is "attr()", "attr(num)" or "attr(bool)", get html attribute value and remove it
		if (default_value.startsWith?.('attr(')) {
			const type = default_value;
			const raw_val = this.getAttribute(state_name);
			this.removeAttribute(state_name);

			if (raw_val === null) {
				default_value = type === 'attr(bool)' ? false : null;
			} else {
				if (type === 'attr(num)') default_value = Number(raw_val);
				else if (type === 'attr(bool)') default_value = raw_val !== 'false';
				else default_value = raw_val;
			}
		}

		this[state_name] = default_value;
	}

	/**
	 * Defines a custom class with default presence
	 * @param {string} class_name - Name of the class
	 * @param {boolean} default_present - Whether the class is present by default
	 */
	setClass(class_name, default_present, onChange = null) {
		Object.defineProperty(this, class_name, {
			get: () => this.classList.contains(class_name),
			set: value => this.classList.toggle(class_name, value)
		});

		this[class_name] = default_present;
		onChange(default_present);
		this.watched_classes.push([class_name, onChange]);
	}

	/**
	 * Adds an event listener on window and removes it on diconnect event
	 * @param {string} event_name - Event name
	 * @param {function} callback - The callback to call on event
	 */
	globalListener(event_name, callback) {
		window.addEventListener(event_name, callback);
		this.global_listeners.push([event_name, callback]);
	}

	disconnectedCallback() {
		for (const [event_name, callback] of this.global_listeners) {
			window.removeEventListener(event_name, callback);
		}
	}
}

function register(ComponentClass) {
	if (ComponentClass.defined) return;
	const tag = ComponentClass.tag;
	if (!tag) throw new Error('Missing custom component tag');
	ComponentClass.defined = true;
	console.log(`Defining <${tag}> component`);
	customElements.define(tag, ComponentClass);
}

/**
 * Emmet-like template string tag for generating elements with tag, id, classes, attributes, and content
 * @param {TemplateStringsArray} strings - Template strings array
 * @param  {...any} values - Values to interpolate into the template
 * @returns {HTMLElement} The generated HTMLElement
 * @example
 * const element = emmet`div#myId.myClass[title="My Title"]{Hello World}`;
 * document.body.appendChild(element);
 */
function emmet(strings, ...values) {
	const raw_string = raw(strings, ...values);
	const match = raw_string.match(/^([a-zA-Z0-9\-]+)?(?:#([a-zA-Z0-9\-_]+))?(?:\.([a-zA-Z0-9\-_\.]+))?(?:\[([^\]]+)\])?(?:\{([^}]*)\})?$/);

	if (!match) throw new Error(`Invalid emmet string: ${raw_string}`);

	const [, tag = 'div', id, classList, attrString, content] = match;
	const element = document.createElement(tag);

	if (id) element.id = id;
	if (classList) element.className = classList.replace(/\./g, ' ');

	if (attrString) {
		const attrRegex = /([a-zA-Z0-9\-_]+)(?:="([^"]*)")?/g;
		let attrMatch;
		while ((attrMatch = attrRegex.exec(attrString)) !== null) {
			const [, attrName, attrValue] = attrMatch;
			element.setAttribute(attrName, attrValue || '');
		}
	}

	if (content) element.textContent = content;

	return element;
}
