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
 */
export class Repost {
	/**
	 * Processes an event and stores its data or replies to it.
	 * @param {Irc.MessageEvent} event - Event to process.
	 */
	static async process(event) {
		/** Gets link string. */
		const index = event.message.indexOf('https://');
		const indexEnd = event.message.indexOf(' ', index) != -1 ? event.message.indexOf(' ', index) : 0;
		const link = event.message.slice(index, indexEnd);
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

		const [post, built] = await Posts.findOrBuild({
			where: { link: link },
			defaults: { link: link, poster: event.userName, date: Date.now() }
		});

		if (built) {
			post.save();
			return; // Exit after, no need to check repost if the link is new.
		}

		if (event.userName != post['poster']) {
			const timeStr = formatTimeString(Date.now() - post['date']);
			IrcClient.message(event.channel, `/me IE Repost! this was already posted ${timeStr} ago!`);
		}
	}
}

/**
 * Returns a formatted string (_h _m _s) from milliseconds.
 * @param {number} milliseconds
 * @returns {String}
 */
function formatTimeString(milliseconds) {
	/** Get time values */
	const hours = Math.floor(milliseconds / (1000 * 60 * 60));
	const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

	/** Format values */
	const hoursStr = hours > 1 ? `${hours} hours` : hours > 0 ? `${hours} hour` : '';
	const minutesStr = minutes > 1 ? `${minutes} minutes` : minutes > 0 ? `${minutes} minute` : '';
	const secondsStr = seconds > 1 ? `${seconds} seconds` : seconds > 0 ? `${seconds} second` : '';

	return `${hoursStr} ${minutesStr} ${secondsStr}`;
}
