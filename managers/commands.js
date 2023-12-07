// @ts-check

/**
 * Contains a static manager class and data-struct classes
 * for ease of detacting and maintaining commands.
 * @module CommandManager
 * @author Daniel "Znx" Levi <LeviDaniel2610@gmail.com>
 */

/** Imports: */
import Twitch from '../clients/twitch.js';
import IrcClient, * as Irc from '../clients/irc.js';
import UserManager, * as User from './users.js';

/**
 * A manager class that manages all command data and trigger conditons.
 * @default
 */
export default class CommandManager {
	/**
	 * The list of all command data-struct instances.
	 * @type {Command[]}
	 * @static
	 */
	static #commands = [];

	/**
	 * @typedef {object} CommandSettings
	 * @property {string[]} triggers - The word/s to look for to cause the command to trigger.
	 * @property {Rank} [rank = Rank.DEFAULT] - The rank value that is required to call the command.
	 * @property {number} [cooldown = 0] - The time in miliseconds that the user needs to wait until they can call the command again.
	 */

	/**
	 * A function that adds the function/method the the manager's commands array.
	 * @param {CommandSettings} settings - The command settings
	 * @param {function(Irc.MessageEvent): void} callback - The function to callback when the command is triggered.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static create(settings, callback) {
		let command = new Command(callback, settings.triggers, settings.rank, settings.cooldown);
		CommandManager.#commands.push(command);
	}

	/**
	 * Processes an irc-event to check if it meets commands conditions.
	 * if it does, call the callback function for that command.
	 * @param {Irc.MessageEvent} event - The irc-event to process.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async process(event) {
		console.log('processing: ', event.message);
		for (const command of CommandManager.#commands) {
			console.log('checking: ', command.triggers[0], command.isTriggered(event), command.isPermitted(event));
			if (command.isTriggered(event) && command.isPermitted(event)) {
				const response = await Twitch.getStreams({ id: event.roomId });
				if (!response?.data.data[0]) {
					return; // Channel is online, quit function.
				}
				if (command.cooldown > 0) {
					command.setCooldown(event.roomId, event.userId); // Set a cooldown.
				}
				command.callback(event);
				return; // Stop looping over commands array.
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
 * Enum representing command ranks values:
 *
 *     BANNED:  -1 // The user is banned from using the bot.
 *     DEFAULT:  0 // The default rank given to users.
 *     TRUSTED: +1 // The user is responsible and wont spam annoying/abusive commands.
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
 * @classdesc A command data-struct class with some functionalities.
 */
export class Command {
	/**
	 * @param {function(Irc.MessageEvent): void} callback - The function to callback when the command is triggered.
	 * @param {string[]} triggers - The word/s to look for to cause the command to trigger.
	 * @param {Rank} [rank = Rank.DEFAULT] - The rank value that is required to call the command.
	 * @param {number} [cooldown = 0] - The time in miliseconds that the user needs to wait until they can call the command again.
	 * @constructor
	 */
	constructor(callback, triggers, rank = Rank.DEFAULT, cooldown = 0) {
		/**
		 * @type {function(Irc.MessageEvent): void} callback - The function to callback when the command is triggered.
		 */
		this.callback = callback;

		/**
		 * @type {string[]} triggers - The name/s to look for to cause the command to trigger.
		 */
		this.triggers = triggers;

		/**
		 * @type {Rank} rank - The rank value that is required to call the command.
		 */
		this.rank = rank;

		/**
		 * @type {number} cooldown - The time in miliseconds that the user needs to wait until they can call the command again.
		 */
		this.cooldown = cooldown;

		/**
		 * @type {object} cooldowns - An object containing booleans of whether or not a user is on cooldown, sorted in to room ids then user ids.
		 */
		this.cooldowns = {};
	}

	/**
	 * Returns a boolean representing whether or not the user is allowed to use the command.
	 * @param {Irc.MessageEvent} event - The event to check permissions on.
	 * @returns {boolean} Permission state boolean.
	 * @method
	 */
	isPermitted(event) {
		if (this.rank > UserManager.getRank(event.userId)) {
			return false; // User not authorized to use command.
		}
		if (this.isCooldown(event.roomId, event.userId)) {
			return false; // User is under cooldown.
		}
		return true;
	}

	/**
	 * Returns a boolean representing whether or not the event message contains one of the command's triggers.
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
