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
				setTimeout(async () => {
					console.log('\x1b[2mosu! memory recconecting.\x1b[0m');
					OsuMemory.#socket = await OsuMemory.connectGosu();
				}, 15 * 1000); // Try reconnecting after 15s.
			};
		});
	}

	/**
	 * Return a formated now playing string.
	 * @returns {Promise<String>}
	 * @static
	 * @method
	 */
	static async getNpString() {
		let beatMap = OsuMemory.#gosuV1?.['menu']?.['bm'];
		let metaData = beatMap?.['metadata'];
		return `${metaData?.['artist']} - ${metaData?.['title']} [${metaData?.['difficulty']}] 
        (${metaData?.['mapper']}, ${beatMap?.['stats']?.['fullSR']}*) https://osu.ppy.sh/b/${beatMap?.['id']}`;
	}
}

/** Initialize on import */
await OsuMemory.init();
