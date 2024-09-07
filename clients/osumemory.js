// @ts-check

/**
 * Contains a static manager class for importing and managing
 * osu! instance data with gosu, tosu (and stream companion in the future, doc doesnt exist lol)
 * (Planned to be its own bot in the future!)
 * @module OsuMemory
 * @author Daniel "Znx" Levi
 */

import 'dotenv/config';
import WebSocket from 'ws';

/**
 *
 */
export default class OsuMemory {
	/**
	 * The osu! memory websocket.
	 * @type {WebSocket}
	 * @static
	 */
	static #socket;

	/**
	 * If to search for a osu! memory websocket.
	 * @type {boolean}
	 * @static
	 */
	static #searching = false;

	/**
	 * The ws-v1 info object.
	 * @type {Object | undefined}
	 * @static
	 */
	static #gosuV1;

	/**
	 * Initializes a connection with an osu! memory reader.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async init() {
		OsuMemory.#socket = await OsuMemory.connectGosu();
	}

	static async connectGosu() {
		return new Promise((resolve, reject) => {
			let socket = new WebSocket('http://localhost:24050/ws');

			/** OnOpen function */
			socket.onopen = (event) => {
				console.log('\x1b[32mosu! memory server connected.\x1b[0m');
				resolve(socket);
			};

			/** OnError function */
			socket.onerror = (event) => {
				console.log('\x1b[31mosu! memory server not found at port 24050.\x1b[0m');
				resolve(undefined);
			};

			/** OnResponse function */
			socket.onmessage = (event) => {
				if (typeof event.data == 'string') {
					OsuMemory.#gosuV1 = JSON.parse(event.data);
				}
			};

			/** OnClose function */
			socket.onclose = (event) => {
				console.log('\x1b[2mosu! memory closed, retrying in 15s.\x1b[0m');
				if (!OsuMemory.#searching) {
					return; // Stop searching.
				}
				setTimeout(async () => {
					console.log('\x1b[2mosu! memory recconecting.\x1b[0m');
					OsuMemory.#socket = await OsuMemory.connectGosu();
				}, 15 * 1000); // Try reconnecting after 15s.
			};
		});
	}

	/**
	 * Toggles the osu! memory searching state.
	 * @returns {Promise<boolean>} Search state after toggle.
	 * @static
	 * @method
	 */
	static async toggleSearch() {
		OsuMemory.#searching = !OsuMemory.#searching;
		if (OsuMemory.#searching) {
			console.log('\x1b[2mosu! memory recconecting.\x1b[0m');
			OsuMemory.#socket = await OsuMemory.connectGosu(); // Restart search.
		}
		return OsuMemory.#searching;
	}

	/**
	 * Sets the osu! memory searching state.
	 * @param {boolean} state
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async setSearch(state) {
		const oldState = OsuMemory.#searching;
		OsuMemory.#searching = state;
		if (!oldState && state) {
			console.log('\x1b[2mosu! memory recconecting.\x1b[0m');
			OsuMemory.#socket = await OsuMemory.connectGosu(); // Restart search.
		}
	}

	/**
	 * Returns a formated now playing string.
	 * @returns {Promise<String>}
	 * @static
	 * @method
	 */
	static async getNpString() {
		const menu = OsuMemory.#gosuV1?.['menu'];
		if (!menu) {
			/** menu is Undefined. */
			return 'No map found.';
		}
		const beatMap = menu?.['bm'];
		const metaData = beatMap?.['metadata'];
		return `${metaData?.['artist']} - ${metaData?.['title']} [${metaData?.['difficulty']}] +${beatMap?.['mods']?.['str']} 
				(${metaData?.['mapper']}, ${beatMap?.['stats']?.['fullSR']}*) https://osu.ppy.sh/b/${beatMap?.['id']}`;
	}

	/**
	 * Returns a formated now playing pp string.
	 * @returns {Promise<String>}
	 * @static
	 * @method
	 */
	static async getNpppString() {
		const menu = OsuMemory.#gosuV1?.['menu'];
		if (!menu) {
			/** menu is Undefined. */
			return 'No map found.';
		}
		return ``;
	}
}

/** Initialize on import */
await OsuMemory.init();
