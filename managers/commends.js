// @ts-check

/**
 * Contains a static manager class and data-struct classes
 * for ease of detacting and maintaining commends.
 * @module CommendManager
 * @author Daniel "Znx" Levi <LeviDaniel2610@gmail.com>
 */

/** Imports: */
import Twitch from '../clients/twitch.js';
import IrcClient, * as Irc from '../clients/irc.js';
import UserManager, * as User from './users.js';

/**
 * A manager class that manages all commend data and trigger conditons.
 * @default
 */
export default class CommendManager {
	/**
	 * The list of all commend data-struct instances.
	 * @type {Commend[]}
	 * @static
	 */
	static #commends = [];

	/**
	 * @typedef {object} CommendSettings
	 * @property {string[]} triggers - The word/s to look for to cause the commend to trigger.
	 * @property {Rank} [rank = Rank.DEFAULT] - The rank value that is required to call the commend.
	 * @property {number} [cooldown = 0] - The time in miliseconds that the user needs to wait until they can call the commend again.
	 */

	/**
	 * A function that adds the function/method the the manager's commends array.
	 * @param {CommendSettings} settings - The commend settings
	 * @param {function(Irc.MessageEvent): void} callback - The function to callback when the commend is triggered.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static create(settings, callback) {
		let commend = new Commend(callback, settings.triggers, settings.rank, settings.cooldown);
		CommendManager.#commends.push(commend);
	}

	/**
	 * Processes an irc-event to check if it meets commends conditions.
	 * if it does, call the callback function for that commend.
	 * @param {Irc.MessageEvent} event - The irc-event to process.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async process(event) {
		console.log('processing: ', event.message);
		for (const commend of CommendManager.#commends) {
			console.log('checking: ', commend.triggers[0], commend.isTriggered(event), commend.isPermitted(event));
			if (commend.isTriggered(event) && commend.isPermitted(event)) {
				const response = await Twitch.getStreams({ id: event.roomId });
				if (!response?.data.data[0]) {
					return; // Channel is online, quit function.
				}
				if (commend.cooldown > 0) {
					commend.setCooldown(event.roomId, event.userId); // Set a cooldown.
				}
				commend.callback(event);
				return; // Stop looping over commends array.
			}
		}
	}

	// helper functions:

	static getVar(event, name) {
		let words = event.message.split(' ');
		let index = words.indexOf(`-${name}`);
		return index != -1 ? words[index + 1] : null; // returns null if trigger not found
	}

	static getVarBoolean(event, name) {
		let words = event.message.split(' ');
		return words.includes(`-${name}`);
	}

	static getVarString(event, name) {
		let words = event.message.split(' ');
		let index = words.indexOf(`-${name}`);
		/*
			function unfinished, do not use
			TODO:
			make function return all vars after trigger(index) as a string
		*/
		return null;
	}

	static getVarArray(event, name) {
		let words = event.message.split(' ');
		let index = words.indexOf(`-${name}`);
		/*
			function unfinished, do not use
			TODO:
			make function return all vars after trigger(index) as an array
		*/
		return null;
	}
}

/**
 * Enum representing commend ranks values:
 *
 *     BANNED:  -1 // The user is banned from using the bot.
 *     DEFAULT:  0 // The default rank given to users.
 *     TRUSTED: +1 // The user is responsible and wont spam annoying/abusive commends.
 *     ADMIN:   +2 // The user has control over the bot.
 *     OWNER:   +3 // The user is the owner of the bot and has full control over it.
 *
 * @enum {number}
 */
export const Rank = {
	BANNED: -1,
	DEFAULT: 0,
	TRUSTED: 1,
	ADMIN: 2,
	OWNER: 3
};

/**
 * @classdesc A commend data-struct class with some functionalities.
 */
export class Commend {
	/**
	 * @param {function(Irc.MessageEvent): void} callback - The function to callback when the commend is triggered.
	 * @param {string[]} triggers - The word/s to look for to cause the commend to trigger.
	 * @param {Rank} [rank = Rank.DEFAULT] - The rank value that is required to call the commend.
	 * @param {number} [cooldown = 0] - The time in miliseconds that the user needs to wait until they can call the commend again.
	 * @constructor
	 */
	constructor(callback, triggers, rank = Rank.DEFAULT, cooldown = 0) {
		/**
		 * @type {function(Irc.MessageEvent): void} callback - The function to callback when the commend is triggered.
		 */
		this.callback = callback;

		/**
		 * @type {string[]} triggers - The name/s to look for to cause the commend to trigger.
		 */
		this.triggers = triggers;

		/**
		 * @type {Rank} rank - The rank value that is required to call the commend.
		 */
		this.rank = rank;

		/**
		 * @type {number} cooldown - The time in miliseconds that the user needs to wait until they can call the commend again.
		 */
		this.cooldown = cooldown;

		/**
		 * @type {object} cooldowns - An object containing booleans of whether or not a user is on cooldown, sorted in to room ids then user ids.
		 */
		this.cooldowns = {};
	}

	/**
	 * Returns a boolean representing whether or not the user is allowed to use the commend.
	 * @param {Irc.MessageEvent} event - The event to check permissions on.
	 * @returns {boolean} Permission state boolean.
	 * @method
	 */
	isPermitted(event) {
		if (this.rank > UserManager.getRank(event.userId)) {
			return false; // User not authorized to use commend.
		}
		if (this.isCooldown(event.roomId, event.userId)) {
			return false; // User is under cooldown.
		}
		return true;
	}

	/**
	 * Returns a boolean representing whether or not the event message contains one of the commend's triggers.
	 * @param {Irc.MessageEvent} event -The event to check triggers on.
	 * @returns {boolean} Containing state boolean.
	 * @method
	 */
	isTriggered(event) {
		let words = event.message.split(' ');
		for (const trigger of this.triggers) {
			if (words[0] == `$${trigger}`) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns a boolean representing whether or not the user is on cooldown.
	 * if user does not exist, assume not and return false.
	 * @param {number} roomId - The id of the channel/room.
	 * @param {number} userId - The id of the user.
	 * @returns {boolean} Whether or not the user is on cooldown.
	 * @method
	 */
	isCooldown(roomId, userId) {
		return this.cooldowns[roomId]?.[userId] ?? false;
	}

	/**
	 * Sets a cooldown, set the cooldown value to true for the user
	 * and sets a timeout to change it back to false.
	 * @param {number} roomId - The id of the channel/room.
	 * @param {number} userId - The id of the user.
	 * @returns {void}
	 * @method
	 */
	setCooldown(roomId, userId) {
		// checks if an obj exists for the channel, if not create one
		if (!this.cooldowns[roomId]) {
			this.cooldowns[roomId] = {};
		}
		this.cooldowns[roomId][userId] = true;
		setTimeout(() => {
			this.cooldowns[roomId][userId] = false;
		}, this.cooldown);
	}
}
