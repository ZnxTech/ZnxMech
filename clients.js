/*
    clients.js : [Client]
    ---------------------
*/

// imports
import 'dotenv/config';
import Query from 'node:querystring';
import Axios from 'axios';
import * as DataType from './data-types.js';
import * as Manager from './managers.js';

/*
    clients
*/

// Twitch api
export class Twitch {
	static #token = {};

	static async init() {
		// initial token request
		let response = await Twitch.requestToken();
		Twitch.#token = response.data;

		// checks if the token is validate every 15 minutes
		setInterval(() => {
			Twitch.maintainToken();
		}, 15 * 60 * 1000);
	}

	/*
        token handling
    */

	static async maintainToken() {
		let validation = await Twitch.validateToken();

		if (validation.status == 200) {
			if (validation.data['expires_in'] < 60 * 60) {
				let response = await Twitch.requestToken();
				Twitch.#token = response.data;
			}
		} else {
			let response = await Twitch.requestToken();
			Twitch.#token = response.data;
		}
	}

	static async requestToken() {
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
		}
	}

	static async validateToken() {
		try {
			return await Axios.request({
				baseURL: 'https://id.twitch.tv',
				url: '/oauth2/validate',
				method: 'get',
				headers: {
					Authorization: `OAuth ${Twitch.#token['access_token']}`
				}
			});
		} catch (error) {
			console.error(error);
		}
	}

	/*
        api requests
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
		}
	}

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
		}
	}

	static async getUserData(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/users?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
		}
	}

	static async getStreams(querys) {
		try {
			return await Axios.request({
				baseURL: 'https://api.twitch.tv',
				url: `/helix/streams?${Query.stringify(querys)}`,
				method: 'get',
				headers: {
					Authorization: `Bearer ${Twitch.#token['access_token']}`,
					'Client-Id': `${process.env.CLIENT_ID}`
				}
			});
		} catch (error) {
			console.error(error);
		}
	}
}
