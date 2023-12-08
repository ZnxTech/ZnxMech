// @ts-check

/**
 * Contains a static client class, wrapper for the Twitch API.
 * @module Twitch
 * @author Daniel "Znx" Levi
 */

/** Imports: */
import 'dotenv/config';
import Query from 'node:querystring';
import Axios from 'axios';

/**
 * A Twitch client class, wrapper for the API.
 * @default
 */
export default class Twitch {
	/**
	 * OAuth 2.0 token.
	 * @typedef Token
	 * @property {string} access_token
	 * @property {string} token_type
	 * @property {number} expires_in // time in seconds
	 */

	/**
	 * The Twitch client oauth token.
	 * @type {Token|undefined}
	 * @static
	 */
	static #token;

	/**
	 * Initializes token handling for the Twitch API.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async init() {
		// initial token request
		let response = await Twitch.requestAppToken();
		Twitch.#token = response?.data;

		// checks if the token is validate every 15 minutes
		setInterval(Twitch.maintainToken, 15 * 60 * 1000);
	}

	/**
	 * Token handling:
	 * ---------------
	 */

	/**
	 * Maintains a valid token to the Twitch API.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async maintainToken() {
		let validation = await Twitch.validateToken(Twitch.#token);

		// Check if request is valid
		if (validation) {
			// Token valid, check expiration time.
			if (validation.data['expires_in'] < 1 * 60 * 60) {
				// Token expires in less then an hour, request a new token.
				let response = await Twitch.requestAppToken();
				Twitch.#token = response?.data;
			}
		} else {
			// Token invalid, request a new token.
			let response = await Twitch.requestAppToken();
			Twitch.#token = response?.data;
		}
	}

	/**
	 * Validates a Twitch API token.
	 * @param {Token|undefined} token - The token to validate.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async validateToken(token) {
		if (!token) {
			return undefined;
		}
		try {
			return await Axios.request({
				baseURL: 'https://id.twitch.tv',
				url: '/oauth2/validate',
				method: 'get',
				headers: {
					Authorization: `OAuth ${token?.['access_token']}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Request an app access Twitch API token with client credentials grant flow.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async requestAppToken() {
		try {
			return await Axios.request({
				baseURL: 'https://id.twitch.tv',
				url: `/oauth2/token
				?client_id=${process.env.CLIENT_ID}
				&client_secret=${process.env.CLIENT_SECRET}
				&grant_type=client_credentials`,
				method: 'post'
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * API requests:
	 * -------------
	 */

	/**
	 * Gets information about one or more channels.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getChannelInfo(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/channels?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets the broadcaster’s list of custom emotes.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getChannelEmotes(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/chat/emotes?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets the list of global emotes.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getGlobalEmotes() {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: '/helix/chat/emotes/global',
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets emotes for one or more specified emote sets.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getEmoteSets(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/chat/emotes/set?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets the broadcaster’s list of custom chat badges.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getChannelBadges(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/chat/badges?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets Twitch’s list of chat badges.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getGlobalBadges() {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: '/helix/chat/badges/global',
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets the broadcaster’s chat settings.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getChatSettings(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/chat/settings?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets the color used for the user’s name in chat.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getUserColor(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/chat/color?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets information about all broadcasts on Twitch.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getTopGames(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/games/top?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets information about specified categories or games.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getGames(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/games?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets the games or categories that match the specified query.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async searchCategories(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/search/categories?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets the channels that match the specified query
	 * and have streamed content within the past 6 months.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async searchChannels(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/search/channels?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets a list of all streams. The list is in descending order
	 * by the number of viewers watching the stream.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getStreams(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/streams?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets information about the specified Twitch team.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getTeams(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/teams?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets information about one or more users.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getUsers(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/users?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Gets information about one or more published videos.
	 * You may get videos by ID, by user, or by game/category.
	 * @param {object} querys - Request querys.
	 * @returns {Promise<import("axios").AxiosResponse|undefined>}
	 * @static
	 * @method
	 */
	static async getVideos(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/videos?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token?.['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Deprecated - Do not use:
	 * ------------------------
	 */

	/**
	 * @deprecated Do not use.
	 */
	static async createEventSub(content) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: '/helix/eventsub/subscriptions',
				method: 'post',
				headers: {
					Authorization: `Bearer ${process.env.OWNER_OAUTH}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				},
				data: content
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * @deprecated Do not use.
	 */
	static async deleteEventSub(id) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/eventsub/subscriptions?id=${id}`,
				method: 'delete',
				headers: {
					Authorization: `Bearer ${process.env.OWNER_OAUTH}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}
}
