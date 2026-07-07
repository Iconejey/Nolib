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
 * @returns {string} The final HTML string
 */
function raw(strings, ...values) {
	return strings.reduce((result, str, i) => result + str + (i < values.length ? values[i] : ''), '');
}

/**
 * Defines a style block in the document head
 * @param {string} string - CSS string to add to the document
 */
function css(strings, ...values) {
	const style = document.createElement('style');
	style.textContent = raw(strings, ...values);
	document.head.appendChild(style);
}

/**
 * Base class for creating custom HTML components
 * Extends HTMLElement and provides lifecycle methods
 * @class
 * @extends HTMLElement
 */
class CustomComponent extends HTMLElement {
	constructor() {
		super();

		// Reate getters for each selector in class static selectors attribute
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
	 * Defines a custom string attribute with default value
	 * @param {string} attr_name - Name of the attribute
	 * @param {any} default_value - Default value for the attribute
	 */
	stringAttribute(attr_name, default_value, onChange = null) {
		// If onchange is an element, bind to its textContent
		if (onChange instanceof HTMLElement) {
			const element = onChange;
			onChange = value => {
				element.textContent = value;
			};
		}

		const snake_case_name = attr_name.replaceAll('-', '_');
		Object.defineProperty(this, snake_case_name, {
			get: () => this.getAttribute(attr_name),
			set: value => {
				if (value === null || value === undefined || value === '') this.removeAttribute(attr_name);
				else this.setAttribute(attr_name, value);
				onChange?.(value);
			}
		});

		this[snake_case_name] = this[snake_case_name] ?? default_value;
	}

	/**
	 * Defines a custom boolean attribute with default value
	 * @param {string} attr_name - Name of the attribute
	 * @param {boolean} default_value - Default boolean value
	 */
	booleanAttribute(attr_name, default_value, onChange = null) {
		const snake_case_name = attr_name.replaceAll('-', '_');
		Object.defineProperty(this, snake_case_name, {
			get: () => this.hasAttribute(attr_name),
			set: value => {
				if (value) this.setAttribute(attr_name, '');
				else this.removeAttribute(attr_name);
				onChange?.(value);
			}
		});

		this[snake_case_name] = this[snake_case_name] || default_value;
	}

	/**
	 * Defines a custom numeric attribute with default value
	 * @param {string} attr_name - Name of the attribute
	 * @param {number} default_value - Default numeric value
	 */
	numericAttribute(attr_name, default_value, onChange = null) {
		// If onchange is an element, bind to its textContent
		if (onChange instanceof HTMLElement) {
			const element = onChange;
			onChange = value => {
				element.textContent = value;
			};
		}

		const snake_case_name = attr_name.replaceAll('-', '_');
		Object.defineProperty(this, snake_case_name, {
			get: () => +this.getAttribute(attr_name),
			set: value => {
				this.setAttribute(attr_name, value);
				onChange?.(value);
			}
		});

		this[snake_case_name] = this.hasAttribute(attr_name) ? this[snake_case_name] : default_value;
	}

	/**
	 * Defines a custom class with default presence
	 * @param {string} class_name - Name of the class
	 * @param {boolean} default_present - Whether the class is present by default
	 */
	defineClass(class_name, default_present, onChange = null) {
		const snake_case_name = class_name.replaceAll('-', '_');
		Object.defineProperty(this, snake_case_name, {
			get: () => this.classList.contains(class_name),
			set: value => {
				this.classList.toggle(class_name, value);
				onChange?.(value);
			}
		});

		this[snake_case_name] = this[snake_case_name] || default_present;
	}
}

/**
 * Registers a custom component with the browser
 * @param {typeof CustomComponent} componentClass - The class of the custom component to register
 * @example
 * // Define a custom component
 * defineComponent(
 *     class extends CustomComponent {
 *         static tag = 'my-component';
 *
 *         async init() {
 *             this.render`<p>Hello, World!</p>`;
 *         }
 *     }
 * );
 */
function defineComponent(componentClass) {
	// Define the custom element
	customElements.define(componentClass.tag, componentClass);
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
	const match = raw_string.match(/^([a-zA-Z0-9]+)?(?:#([a-zA-Z0-9\-_]+))?(?:\.([a-zA-Z0-9\-_\.]+))?(?:\[([^\]]+)\])?(?:\{([^}]*)\})?$/);

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

// ----------- Utilities -----------

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
