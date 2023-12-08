// @ts-check

/**
 * Contains a static manager class and a data-struct class
 * for ease of detacting and maintaining channels.
 * @module ChannelManager
 * @author Daniel "Znx" Levi
 */

/** Imports: */
import IrcClient from '../clients/irc.js';
import Twitch from '../clients/twitch.js';

/**
 * A manager class that manages all channel data such as chat settings and connection status.
 * @default
 */
export default class ChannelManager {
	/**
	 * A map containing all registered channels keyed by their id.
	 * @type {Map<number, Channel>}
	 * @static
	 */
	static #channels = new Map();

	/**
	 * A map containing all registered channel's ids keyed by their name.
	 * this is for getting a channel's id by their name more easily.
	 * @type {Map<string, number>}
	 * @static
	 */
	static #idCache = new Map();

	/**
	 * Initializes channel checking.
	 * @returns {void}
	 * @deprecated
	 * @static
	 * @method
	 */
	static init() {
		// some file/DB loading functions and shit
	}

	/**
	 * Creates a new channel and adds it to maps.
	 * @param {number} id - The channel's id.
	 * @param {string} [name] - The channel's name.
	 * @returns {Promise<Channel|undefined>} - Returns the channel created, undefined if channel creation failed.
	 * @static
	 * @method
	 */
	static async create(id, name = '') {
		if (!name) {
			// Gets name from API if not set.
			const response = await Twitch.getUsers({ id: id });
			name = response?.data.data[0]?.['login'];
		}
		// Check if the API returned a valid name.
		if (name) {
			const channel = new Channel(id, name);
			ChannelManager.#channels.set(id, channel);
			ChannelManager.#idCache.set(name, id);
			return channel;
		}
	}

	/**
	 * Deletes a channel from maps.
	 * @param {number} id - The channel's id.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static delete(id) {
		const channel = ChannelManager.#channels.get(id);
		if (channel) {
			ChannelManager.#idCache.delete(channel.name);
			ChannelManager.#channels.delete(id);
		}
	}

	/**
	 * Joins a channel and updates it's data.
	 * @param {number} id - The channel's id.
	 * @param {string} [name] - The channel's name.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async joinChannel(id, name = '') {
		const channel = await ChannelManager.#getChannel(id, name);
		if (channel) {
			IrcClient.join(channel.name);
			channel.isConnected = true;
		}
	}

	/**
	 * Parts a channel and updates it's data.
	 * @param {number} id - The channel's id.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static partChannel(id) {
		const channel = ChannelManager.#channels.get(id);
		if (channel) {
			IrcClient.part(channel.name);
			channel.isConnected = false;
		}
	}

	/**
	 * Setters:
	 * --------
	 */

	/**
	 * Twitch channel chat settings.
	 * @typedef {Object} ChatSettings
	 * @property {boolean} isEmoteOnly - Boolean of whether or not the room is in emote only mode.
	 * @property {boolean} isSubOnly - Boolean of whether or not the room is in subscriber only mode.
	 * @property {number} isFollowOnly - The number of minutes followed required to send messages, -1 if disabled.
	 * @property {number} slow - The number of seconds required to wait to send another message.
	 * @property {boolean} r9k - Boolean of whether or not the room is in r9k unique messages mode.
	 */

	/**
	 * Sets a channel's setttings.
	 * @param {number} id - The channels's id.
	 * @param {ChatSettings} settings - Chat settings as an object.
	 * @returns {Promise<void>}
	 */
	static async setSettings(id, settings) {
		const channel = await ChannelManager.#getChannel(id);
		if (channel) {
			channel.isEmoteOnly = settings.isEmoteOnly;
			channel.isSubOnly = settings.isSubOnly;
			channel.isFollowOnly = settings.isFollowOnly;
			channel.slow = settings.slow;
			channel.r9k = settings.r9k;
		}
	}

	/**
	 * Sets a channel's setttings.
	 * @param {number} id - The channels's id.
	 * @param {string} name - The name to set the channel to.
	 * @returns {void}
	 */
	static setName(id, name) {
		const channel = ChannelManager.#channels.get(id);
		if (channel) {
			ChannelManager.#idCache.delete(channel.name);
			ChannelManager.#idCache.set(name, id);
			channel.name = name;
		}
	}

	/**
	 * Getters:
	 * --------
	 */

	/**
	 * Gets a channel or creates one if user does not exist.
	 * @param {number} id - The channel's id.
	 * @param {string} [name] - The channel's name.
	 * @returns {Promise<Channel|undefined>} The channel.
	 * @static
	 * @method
	 */
	static async #getChannel(id, name = '') {
		const channel = ChannelManager.#channels.get(id);
		if (channel) {
			return channel; // Channel exists.
		}
		// Channel does not exist, create and return one.
		return await ChannelManager.create(id, name);
	}

	/**
	 * Returns an array containing all channel ids stored on the manager.
	 * @returns {number[]} The channel id array.
	 * @static
	 * @method
	 */
	static getChannelIds() {
		return Array.from(ChannelManager.#channels.keys());
	}

	/**
	 * Returns an array containing all channel names stored on the manager.
	 * @returns {string[]} The channel name array.
	 * @static
	 * @method
	 */
	static getChannelNames() {
		return Array.from(ChannelManager.#idCache.keys());
	}

	/**
	 * Returns an array containing all connected channel ids stored on the manager.
	 * @returns {number[]} The channel id array.
	 * @static
	 * @method
	 */
	static getConnectedIds() {
		let ids = [];
		for (const [id, channel] of ChannelManager.#channels) {
			if (channel.isConnected) {
				ids.push(id);
			}
		}
		return ids;
	}

	/**
	 * Returns an array containing all connected channel names stored on the manager.
	 * @returns {string[]} The channel name array.
	 * @static
	 * @method
	 */
	static getConnectedNames() {
		let names = [];
		for (const [id, channel] of ChannelManager.#channels) {
			if (channel.isConnected) {
				names.push(channel.name);
			}
		}
		return names;
	}

	/**
	 * Gets a channel's id, returns undefined if channel does not exist.
	 * @param {string} name - The channel's name.
	 * @returns {number|undefined} The channel's id.
	 * @static
	 * @method
	 */
	static getId(name) {
		return ChannelManager.#idCache.get(name);
	}

	/**
	 * Gets a channel's name, returns undefined if channel does not exist.
	 * @param {number} id - The channel's id.
	 * @returns {string|undefined} The channel's name.
	 * @static
	 * @method
	 */
	static getName(id) {
		return ChannelManager.#channels.get(id)?.name;
	}

	/**
	 * Gets the channel's startup state.
	 * @param {number} id - The channel's id.
	 * @returns {boolean|undefined} The startup state.
	 */
	static isStartup(id) {
		return ChannelManager.#channels.get(id)?.isStartup;
	}

	/**
	 * Gets the channel's connection state.
	 * @param {number} id - The channel's id.
	 * @returns {boolean|undefined} The connection state.
	 */
	static isConnected(id) {
		return ChannelManager.#channels.get(id)?.isConnected;
	}
}

/**
 * @classdesc A channel data-struct class.
 */
export class Channel {
	/**
	 * @param {number} id - The channel's id.
	 * @param {string} name - The channel's name.
	 * @constructor
	 */
	constructor(id, name) {
		/** Channel info: */

		/**
		 * @type {number} id - The channel's id.
		 */
		this.id = id;

		/**
		 * @type {string} name - The channel's name.
		 */
		this.name = name;

		/** Channel chat settings: - assigned at roomstate */

		/**
		 * @type {boolean|undefined} isEmoteOnly - Boolean of whether or not the room is in emote only mode.
		 */
		this.isEmoteOnly = undefined;

		/**
		 * @type {boolean|undefined} isSubOnly - Boolean of whether or not the room is in subscriber only mode.
		 */
		this.isSubOnly = undefined;

		/**
		 * @type {number|undefined} isFollowOnly - The number of minutes followed required to send messages, -1 if disabled.
		 */
		this.isFollowOnly = undefined;

		/**
		 * @type {number|undefined} slow - The number of seconds required to wait to send another message.
		 */
		this.slow = undefined;

		/**
		 * @type {boolean|undefined} r9k - Boolean of whether or not the room is in r9k unique messages mode.
		 */
		this.r9k = undefined;

		/** Channel conditions: */

		/**
		 * @type {boolean} Whether or not to auto connect to the channel to IRC at startup.
		 */
		this.isStartup = false;

		/**
		 * @type {boolean} Whether or not the channel is connected to IRC.
		 */
		this.isConnected = false;
	}
}
