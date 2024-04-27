// @ts-check

/**
 * Contains a static manager class and data-struct classes
 * for ease of detacting and maintaining commands.
 * @module CommandManager
 * @author Daniel "Znx" Levi
 */

/** Imports: */
import Twitch from '../clients/twitch.js';
import IrcClient, * as Irc from '../clients/irc.js';
import Database, { User, Channel } from '../database/database.js';
import { or } from 'sequelize';

/**
 * Enum representing important prefixes.
 * ```
 * COMMAND:  '$' // The command prefix  [ $command ...]
 * ARGUMENT: '-' // The argument prefix [... -arg value ...]
 * ```
 * @enum {string}
 */
const Prefix = {
	COMMAND: '$',
	ARGUMENT: '-'
};

/**
 * Enum representing command ranks values:
 * ```
 * BANNED:  -1 // The user is banned from using the bot.
 * DEFAULT:  0 // The default rank given to users.
 * TRUSTED: +1 // The user is responsible and wont spam annoying/abusive commands.
 * ADMIN:   +2 // The user has control over the bot.
 * OWNER:   +3 // The user is the owner of the bot and has full control over it.
 * ```
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
 * Enum representing command argument values:
 * ```
 * NULL:     0 // The argument is a trigger      [ --arg ... ]
 * NUMBER:  +1 // The argument takes in a number [ --arg 123 ]
 * NUMBER:  +1 // The argument takes in a string [ --arg abc ]
 * ```
 * @enum {number}
 */
export const ArgValue = {
	NULL: 0,
	NUMBER: 1
};

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
	 * @typedef {object} ArgSettings
	 * @property {string[]} triggers - The argument triggers.
	 * @property {ArgValue} type - The type argument input/output.
	 */

	/**
	 * @typedef {object} CommandSettings
	 * @property {string[]} triggers - The word/s to look for to cause the command to trigger.
	 * @property {Object<string, ArgSettings>} [args] - The arguments to look for in the chat message.
	 * @property {Rank} [rank = Rank.DEFAULT] - The rank value that is required to call the command.
	 * @property {string[]} [whitelist = []] - a simple command whitelist.
	 * @property {string[]} [blacklist = []] - a simple command blacklist.
	 * @property {number} [cooldown = 0] - The time in miliseconds that the user needs to wait until they can call the command again.
	 */

	/**
	 * A function that adds the function/method the the manager's commands array.
	 * @param {function(Irc.MessageEvent, Object<string, ArgResult>): void} callback - The function to callback when the command is triggered.
	 * @param {CommandSettings} settings - The command settings.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static create(settings, callback) {
		/** Create command object */
		const command = new Command(settings, callback);
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
		const words = event.message.split(' ');

		for (const command of CommandManager.#commands) {
			/** Check for command triggers */
			if (!command.triggers.some((trigger) => words[0].toLowerCase() == `${Prefix.COMMAND}${trigger}`)) {
				continue; // Event message doesnt contain current command, move to the next one.
			}

			/** Check for command cooldowns */
			if (command.isCooldown(event.roomId, event.userId)) {
				return; // User is under cooldown for this command, exit process.
			}

			/** Check for whitelist */
			if (command.whitelist.length != 0 && !command.whitelist.includes(event.channel)) {
				return; // Channel is not in the existing whitelist.
			}

			/** Check for blacklist */
			if (command.blacklist.includes(event.channel)) {
				return; // Channel is in the blacklist.
			}

			/** Check for command permissions */
			const user = await User.findByPk(event.userId);
			if (command.rank > (user?.['rank'] ?? Rank.DEFAULT)) {
				return; // User is not authorized to use command, exit process.
			}

			/** Check for channel offline/live permissions */
			const channel = await Channel.findByPk(event.roomId);
			if (channel?.['isOfflineOnly'] ?? true) {
				// Channel is offline only, check for if the channel is live.
				const response = await Twitch.getStreams({ user_id: event.roomId });
				if (response?.data.data[0]) {
					return; // Channel is live, exit process.
				}
			}

			/** Command has all the requirements to continue */

			/** Check if to set a cooldown */
			if (command.cooldown > 0) {
				// Set a cooldown.
				command.setCooldown(event.roomId, event.userId);
			}

			/** Parse for command arguments */
			const args = command.getArguments(words);

			/** Call the callback function with the event and the arguments results */
			command.callback(event, args);
			return; // Stop looping over commands array.
		}
	}
}

/**
 * @classdesc A command data-struct class with some functionalities.
 */
export class Command {
	/**
	 * @param {function(Irc.MessageEvent, Object<string, ArgResult>): void} callback - The function to callback when the command is triggered.
	 * @param {CommandSettings} settings - The command settings.
	 * @constructor
	 */
	constructor(settings, callback) {
		/**
		 * @type {function(Irc.MessageEvent, Object<string, ArgResult>): void} callback - The function to callback when the command is triggered.
		 */
		this.callback = callback;

		/**
		 * @type {string[]} triggers - The name/s to look for to cause the command to trigger.
		 */
		this.triggers = settings.triggers;

		/**
		 * @type {Object<string, ArgSettings>} args - The arguments to look for in the chat message.
		 */
		this.args = settings.args ?? {};

		/**
		 * @type {Rank} rank - The rank value that is required to call the command.
		 */
		this.rank = settings.rank ?? Rank.DEFAULT;

		/**
		 * @property {string[]} whitelist - a simple command whitelist.
		 */
		this.whitelist = settings.whitelist ?? [];

		/**
		 * @property {string[]} blacklist - a simple command blacklist.
		 */
		this.blacklist = settings.blacklist ?? [];

		/**
		 * @type {number} cooldown - The time in miliseconds that the user needs to wait until they can call the command again.
		 */
		this.cooldown = settings.cooldown ?? 0;

		/**
		 * @type {object} cooldowns - An object containing booleans of whether or not a user is on cooldown, sorted in to room ids then user ids.
		 */
		this.cooldowns = {};
	}

	/**
	 * @typedef {object} ArgResult
	 * @property {boolean} triggered - true if the argument has been triggered, false otherwise.
	 * @property {string|number|null} value - value of the argument, null if argument trigger or value were not found.
	 */

	/**
	 * Parses all arguments and their values from the command's arg settings.
	 *
	 * it returns the result in an object in the same key the settings were configured in.
	 *
	 * main is the only exeption, you can not name a key 'main' since its used to store the main argument.
	 *
	 * TODO: implement a string argument
	 * @param {string[]} words
	 * @returns {Object<string & 'main', ArgResult>}
	 * @example
	 * ``` js
	 * // In command settings:
	 * {
	 *     triggers: ['join'],
	 *     rank: Rank.ADMIN,
	 *     args: {
	 *         isOfflineOnly: {
	 *             triggers: ['offline', 'o'],
	 *             type: ArgValue.NULL
	 *         }
	 *     }
	 * }
	 *
	 * // User typed:
	 * '$join btmc --offline'
	 * // Result:
	 * {
	 *     main: {
	 *         triggered: true,
	 *         value: 'btmc'
	 *     }
	 *     isOfflineOnly: {
	 *         triggered: true,
	 *         value: null
	 *     }
	 * }
	 *
	 * // User typed:
	 * '$join znxmech'
	 * // Result:
	 * {
	 *     main: {
	 *         triggered: true,
	 *         value: 'znxmech'
	 *     }
	 *     isOfflineOnly: {
	 *         triggered: false,
	 *         value: null
	 *     }
	 * }
	 * ```
	 */
	getArguments(words) {
		/** @type {Object<string & 'main', ArgResult>} */
		const args = {};

		for (const [name, settings] of Object.entries(this.args)) {
			/** Prefix the triggers array */
			const triggers = settings.triggers.map(
				(trigger, index) => `${Prefix.ARGUMENT.repeat(index == 0 ? 2 : 1)}${trigger}`
			);

			/** Use the prefixed array to find the argument index in the words array */
			const index = words.findIndex((word) => triggers.includes(word));

			/** Check if the argument exists */
			if (index == -1) {
				Object.assign(args, { [name]: { triggered: false, value: null } });
				continue; // Invalid index -1. argument not found, go next.
			}

			/** Parse argument value */
			let value;
			switch (settings.type) {
				case ArgValue.NULL:
					value = null;
					break;

				case ArgValue.NUMBER:
					value = Number.isNaN(+words[index + 1]) ? null : +words[index + 1];
					break;

				default:
					value = null;
					break;
			}

			/** Cut out argument and its value, if not null */
			if (value) {
				words.splice(index, 2); // Argument has value, remove trigger and value
			} else {
				words.splice(index, 1); // No argument value, remove trigger only
			}

			Object.assign(args, { [name]: { triggered: true, value: value } });
		}

		/** Assign main string argument */
		const main = words.slice(1).join(' '); // Cut command trigger off and join to string
		Object.assign(args, { main: { triggered: !!main, value: main ? null : main } });

		return args;
	}

	/**
	 * Returns a boolean representing whether or not the user is on cooldown.
	 * if user cooldown does not exist, assume not and return false.
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
