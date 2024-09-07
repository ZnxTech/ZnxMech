// @ts-check

import IrcClient, * as Irc from '../clients/irc.js';
import { Posts } from '../database/database.js';
import { Op } from 'sequelize';

/**
 * Contains chat triggers.
 * @author Daniel "Znx" Levi
 */

/**
 * Looks for link reposts in chat.
 * TODO: Move repost data to db
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
	static async process(event) {
		const index = event.message.indexOf('https://');
		if (index == -1) {
			return; // No link found.
		}

		/** Grab all posts older then a day. */
		const expPosts = await Posts.findAll({
			where: {
				date: { [Op.lt]: Date.now() - 24 * 60 * 60 * 1000 }
			}
		});
		/** Destroy all expired posts */
		for (const expPost of expPosts) {
			expPost.destroy();
		}

		/** Gets link string. */
		const link = event.message.slice(index, event.message.indexOf(' ', index));

		const [post, built] = await Posts.findOrBuild({
			where: { link: link },
			defaults: { link: link, poster: event.userName, date: Date.now() }
		});

		if (built) {
			post.save();
		} else if (event.userName != post['poster']) {
			IrcClient.message(event.channel, `IE Repost!`);
		}
	}
}
