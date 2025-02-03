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
	 * List of website cnames.
	 * @type {string[][]}
	 */
	static cnames = [
		['youtube.com', 'youtu.be'],
		['reddit.com', 'safereddit.com'],
		['twitter.com', 'x.com', 'fxtwitter.com', 'vxtwitter.com']
	];

	/**
	 * Processes an event and stores its data or replies to it.
	 * @param {Irc.MessageEvent} event - Event to process.
	 */
	static async process(event) {
		/** Gets link string. */
		const index = event.message.indexOf('https://');
		const indexSpace = event.message.indexOf(' ', index);
		const indexEnd = indexSpace != -1 ? indexSpace : event.message.length;
		const link = event.message.slice(index, indexEnd);
		if (index == -1) {
			return; // No link found.
		}

		if (link.includes('twitch.tv/btmc')) {
			return;
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
			await post.save();
			return; // Exit after, no need to check repost if the link is new.
		}

		if (event.userName != post['poster']) {
			const timeStr = formatTimeString(Date.now() - post['date']);
			IrcClient.message(event.channel, `/me IE Repost! this was posted ${timeStr} ago!`);
		}
	}
}

/**
 * Returns a formatted string from milliseconds (x hours y minutes z seconds).
 * @param {number} milliseconds
 * @returns {String}
 */
export function formatTimeString(milliseconds) {
	/** Get time values */
	const hours = Math.floor(milliseconds / (1000 * 60 * 60));
	const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

	/** Format values */
	const hoursStr = hours > 1 ? `${hours} hours` : hours > 0 ? `${hours} hour` : '';
	const minutesStr = minutes > 1 ? `${minutes} minutes` : minutes > 0 ? `${minutes} minute` : '';
	const secondsStr = seconds > 1 ? `${seconds} seconds` : seconds > 0 ? `${seconds} second` : '';

	if (hours == 0 && minutes == 0 && seconds == 0) {
		return '<1 seconds';
	}

	return `${hoursStr} ${minutesStr} ${secondsStr}`;
}
