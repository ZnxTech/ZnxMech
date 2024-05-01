// @ts-check

/**
 * @deprecated Leftover code, abandoned.
 * @module MiscTools
 * @author Daniel "Znx" Levi
 */

export class Counter {
	/**
	 * Normal Class Elements:
	 */

	/**
	 * @type {string} The counter's name, used to identify the counter.
	 */
	name;

	/**
	 * @type {RegExp} The counter's RegExp to look for.
	 */
	regex;

	/**
	 * @type {number} The counter's count.
	 */
	count = 0;

	/**
	 * @param {string} name - The counter's name, used to identify the counter.
	 * @param {RegExp} regex - The counter's RegExp to look for.
	 * @constructor
	 */
	constructor(name, regex) {
		/**
		 * @type {string} The counter's name, used to identify the counter.
		 */
		this.name = name;

		/**
		 * @type {RegExp} The counter's RegExp to look for.
		 */
		this.regex = regex;
	}

	/**
	 * Static Class Elements:
	 */

	/**
	 * @type {Object<string, Counter>} The counter list.
	 * @static
	 */
	static #counters = {};

	/**
	 * Creates a new counter instance and adds it to the static object.
	 * @param {string} name - The counter's name.
	 * @param {RegExp} regex - The RegExp to look for.
	 */
	static create(name, regex) {
		const counter = new Counter(name, regex);
		Object.assign(Counter.#counters, { [name]: counter });
	}

	/**
	 * Changes an existing counter's RegExp settings, resets the counter if set to.
	 * @param {string} name - The counter's name.
	 * @param {RegExp} regex - The RegExp to look for.
	 */
	static change(name, regex) {
		const counter = Counter.#counters[name];
		if (counter) {
			counter.regex = regex;
		} else {
			console.log('Invalid counter name');
		}
	}

	/**
	 * Resets the counter back to 0.
	 * @param {string} name - The counter's name.
	 */
	static reset(name) {
		const counter = Counter.#counters[name];
		if (counter) {
			counter.count = 0;
		} else {
			console.log('Invalid counter name');
		}
	}

	/**
	 * Deletes the counter from the static object.
	 * @param {string} name - The counter's name.
	 */
	static delete(name) {
		delete Counter.#counters[name];
	}

	/**
	 * Returns whether or not the counter name exists
	 * @param {string} name The counter's name.
	 * @returns {boolean}
	 */
	static has(name) {
		return Counter.#counters.hasOwnProperty(name);
	}

	/**
	 * Deletes all counters from the static object.
	 */
	static nuke() {
		Counter.#counters = {};
	}

	/**
	 * Goes through all counter's RegExps and increment it the counters
	 * if there is a match in the provided message.
	 * @param {string} message
	 */
	static process(message) {
		for (const [name, counter] of Object.entries(Counter.#counters)) {
			if (message.match(counter.regex)) {
				counter.count++;
				console.log(`${name} counter is now at: ${counter.count}`);
			}
		}
	}
}
