css`
	example-component {
		display: block;

		& button.toggle {
			background-color: blue;

			&.toggled {
				background-color: green;
			}
		}

		& button.add {
			background-color: red;
		}
	}
`;

defineComponent(
	class extends CustomComponent {
		static tag = 'example-component';

		static selectors = {
			$last_toggle_button: 'button:last-of-type',
			$$toggled_buttons: 'button.toggled',
			$add_button: 'button.add'
		};

		connectedCallback() {
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
);
