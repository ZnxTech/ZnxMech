// @ts-check

/**
 * Contains a static manager class and a data-struct class
 * for ease of detacting and maintaining users.
 * @module UserManager
 * @author Daniel "Znx" Levi <LeviDaniel2610@gmail.com>
 */

/** Imports: */
import CommendManager, * as Commend from './commends.js';
import Twitch from '../clients/twitch.js';

/**
 * A manager class that manages all user data such as ranks and points.
 * @default
 */
export default class UserManager {
	/**
	 * A map containing all registered users keyed by their id.
	 * @type {Map<number, User>}
	 * @static
	 */
	static #users = new Map();

	/**
	 * A map containing all registered user's ids keyed by their name.
	 * this is for getting a user's id by their name more easily.
	 * @type {Map<string, number>}
	 * @static
	 */
	static #idCache = new Map();

	/**
	 * Not currently in use.
	 * @returns {void}
	 * @deprecated
	 * @static
	 * @method
	 */
	static init() {
		// some file/DB loading functions and shit
	}

	/**
	 * Creates a new user and adds it to maps.
	 * @param {number} id - The user's id.
	 * @param {string} [name] - The user's name.
	 * @returns {Promise<User|undefined>} - Returns the user created, undefined if user creation failed.
	 * @static
	 */
	static async create(id, name = '') {
		if (!name) {
			// Gets name from API if not set.
			const response = await Twitch.getUsers({ id: id });
			name = response?.data.data[0]?.['login']; // Undefined if request failed or no user found.
		}
		// Check if the API returned a valid name.
		if (name) {
			const user = new User(id, name);
			UserManager.#users.set(id, user);
			UserManager.#idCache.set(name, id);
			return user;
		}
	}

	/**
	 * Deletes a user from maps
	 * @param {number} id - The user's id.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static delete(id) {
		const user = UserManager.#users.get(id);
		if (user) {
			UserManager.#idCache.delete(user.name);
			UserManager.#users.delete(id);
		}
	}

	/**
	 * Not currently in use.
	 * @deprecated
	 * @static
	 * @method
	 */
	static async update(id) {}

	/**
	 * Setters:
	 * --------
	 */

	/**
	 * Sets a user's rank.
	 * @param {number} id - The user's id.
	 * @param {Commend.Rank} rank - The rank to set the user to.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async setRank(id, rank) {
		const user = await UserManager.#getUser(id);
		if (user) {
			user.rank = rank;
		}
	}

	/**
	 * Sets a user's point count.
	 * @param {number} id - The user's id.
	 * @param {number} points - The amount to set the user's points to.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async setPoints(id, points) {
		const user = await UserManager.#getUser(id);
		if (user) {
			user.points = points;
		}
	}

	/**
	 * Adds points to a user's point count.
	 * @param {number} id - The user's id.
	 * @param {number} points - The amount of points to add to the user.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async addPoints(id, points) {
		const user = await UserManager.#getUser(id);
		if (user) {
			user.points += points;
		}
	}

	/**
	 * Getters:
	 * --------
	 */

	/**
	 * Gets a user or creates one if user does not exist.
	 * @param {number} id - The user's id.
	 * @param {string} [name] - The user's name.
	 * @returns {Promise<User|undefined>} The user.
	 * @static
	 * @method
	 */
	static async #getUser(id, name = '') {
		const user = UserManager.#users.get(id);
		if (user) {
			return user; // User exists.
		}
		// User does not exist, create and return one.
		return await UserManager.create(id, name);
	}

	/**
	 * Gets a user's id, returns undefined if user does not exist.
	 * @param {string} name - The user's name.
	 * @returns {number|undefined} The user's id.
	 * @static
	 * @method
	 */
	static getId(name) {
		return UserManager.#idCache.get(name);
	}

	/**
	 * Gets a user's name, returns undefined if user does not exist.
	 * @param {number} id - The user's id.
	 * @returns {string|undefined} The user's name.
	 * @static
	 * @method
	 */
	static getName(id) {
		return UserManager.#users.get(id)?.name;
	}

	/**
	 * Gets a user's rank.
	 * @param {number} id - The user's id.
	 * @returns {Commend.Rank} The user's id.
	 * @static
	 * @method
	 */
	static getRank(id) {
		return UserManager.#users.get(id)?.rank ?? Commend.Rank.DEFAULT;
	}

	/**
	 * Gets a user's point count.
	 * @param {number} id - The user's id.
	 * @returns {number} The user's id.
	 * @static
	 * @method
	 */
	static getPoints(id) {
		return UserManager.#users.get(id)?.points ?? 0;
	}
}

/**
 * @classdesc A user data-struct class.
 */
export class User {
	/**
	 * @param {number} id - The user's id.
	 * @param {string} name - The user's name.
	 * @constructor
	 */
	constructor(id, name) {
		/**
		 * @type {number} id - The user's id.
		 */
		this.id = id;

		/**
		 * @type {string} name - The user's name.
		 */
		this.name = name;

		/**
		 * @type {Commend.Rank} rank - The user's rank.
		 */
		this.rank = Commend.Rank.DEFAULT;

		/**
		 * @type {number} points - The user's points count.
		 */
		this.points = 0;
	}
}
