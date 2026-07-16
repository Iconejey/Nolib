# Nolib

Personnal component-oriented native framework library.

Example:

```js
class ExampleComponent extends CustomComponent {
	static selectors = {
		$last_toggle_button: 'button:last-of-type',
		$$toggled_buttons: 'button.toggled',
		$add_button: 'button.add'
	};

	connectedCallback() {
		this.#class('hidden', false);

		this.innerHTML = html`
			<span>Example Component</span>
			<button class="add">Add</button>
		`;

		this.$add_button.onclick = () => {
			const toggle = emmet`button.toggle{Click me}`;
			toggle.onclick = () => toggle.classList.toggle('toggled');
			this.appendChild(toggle);
		};
	}
}
```
