// @ts-check

import IrcClient, * as Irc from '../clients/irc.js';

/**
 * Contains chat triggers.
 * @author Daniel "Znx" Levi
 */

/**
 * Looks for link reposts in chat.
 */
export class Repost {
	/**
	 * @typedef {object} PostData
	 * @property {string} poster - Username of poster.
	 * @property {string} link - The link that the post included.
	 */

	/**
	 * @type {Object<number, Object<string, PostData>>} posts - Object of all posts keyed by the room ID and then post link.
	 * @static
	 */
	static #posts = {};

	/**
	 * Processes an event and stores its data or replies to it.
	 * @param {Irc.MessageEvent} event - Event to process.
	 */
	static process(event) {
		const index = event.message.indexOf('https://');
		if (index == -1) {
			return; // No link found.
		}

		/** Gets link string. */
		const link = event.message.slice(index, event.message.indexOf(' ', index));

		/** Checks if an obj exists for the channel, if not create one. */
		if (!Repost.#posts[event.roomId]) {
			Repost.#posts[event.roomId] = {};
		}

		if (Object.keys(Repost.#posts[event.roomId]).includes(link)) {
			const post = Repost.#posts[event.roomId][link];
			if (event.userName != post.poster) {
				IrcClient.message(event.channel, `IE Repost!`);
				return; // Repost SHAME and exit process.
			}
		}

		Object.assign(Repost.#posts[event.roomId], { [link]: { poster: event.userName, link: link } });
		setTimeout(() => {
			delete Repost.#posts[event.roomId][link];
		}, 24 * 60 * 60 * 1000); // Check for reposts in 24h.
	}
}
