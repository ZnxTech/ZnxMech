/*
    managers.js : [Manager]
    -----------------------
*/

// imports
import 'dotenv/config';
import * as fs from 'fs';
import * as ws from 'ws';
import * as DataType from './data-types.js';
import * as Client from './clients.js';
import { resolve } from 'path';
import { rejects } from 'assert';
import { log } from 'console';

/*  
    twitch irc manager
*/

export class Irc {
	static #socket;

	static async init() {
		Irc.#socket = await Irc.connect('wss://irc-ws.chat.twitch.tv:443');
	}

	static parse(string) {
		let data = {
			raw: string,
			type: '',
			source: '',
			tags: {},
			args: []
		};

		let splitStr = string.split(' ');
		let index = 0;

		if (splitStr[index].charAt(0) == '@') {
			let rawTags = splitStr[index].slice(1).split(';');
			rawTags.forEach((rawTag) => {
				let pair = rawTag.split('=');
				data.tags[pair[0]] = pair[1];
			});
			index++;
		}

		if (splitStr[index].charAt(0) == ':') {
			data.source = splitStr[index];
			index++;
		}

		data.type = splitStr[index];
		data.args = splitStr.slice(index + 1);

		return data;
	}

	static async connect(url) {
		return new Promise((resolve, reject) => {
			let socket = new ws.WebSocket(url);

			socket.onopen = (response) => {
				socket.send(`PASS oauth:${process.env.BOT_OAUTH}`);
				socket.send(`NICK ${process.env.BOT_NICK.toLowerCase()}`);
				socket.send(`CAP REQ :twitch.tv/commands twitch.tv/tags`);
				resolve(socket);
			};

			socket.onmessage = (response) => {
				let raw = response.data;
				let strings = raw.slice(0, raw.lastIndexOf('\r\n')).split('\r\n'); // '\r\n' spliting tomfoolery
				strings.forEach((string) => {
					let data = Irc.parse(string);
					let event = DataType.Event.create(data);
					Irc.onEvent(event);
				});
			};
		});
	}

	/*
        socket functions
    */

	static async join(channel) {
		Irc.#socket.send(`JOIN #${channel.toLowerCase()}`);
	}

	static async part(channel) {
		Irc.#socket.send(`PART #${channel.toLowerCase()}`);
	}

	static #lastMessage = '';
	static async sendMessage(channel, message) {
		let id = Channel.getCachedId(channel);
		if (Channel.isOnline(id)) {
			return;
		} else if (await Channel.isOnlineApi(id)) {
			Channel.setOnlineStatus(id, true);
			return;
		}

		if (Irc.#lastMessage == message) {
			message += ' ⠀'; // trolling
		}
		Irc.#socket.send(`PRIVMSG #${channel.toLowerCase()} :${message}`);
		Irc.#lastMessage = message;
	}

	static async pong(source) {
		Irc.#socket.send(`PONG ${source}`);
	}

	/*
        irc-event callbacks
    */

	static onEvent(event) {
		switch (event.type) {
			case DataType.Event.types.message:
				Irc.onMessage(event);
				break;

			case DataType.Event.types.userstate:
				Irc.onUserstate(event);
				break;

			case DataType.Event.types.usernotice:
				Irc.onUsernotice(event);
				break;

			case DataType.Event.types.roomstate:
				Irc.onRoomstate(event);
				break;

			case DataType.Event.types.reconnect:
				Irc.onReconnect(event);
				break;

			case DataType.Event.types.join:
				Irc.onJoin(event);
				break;

			case DataType.Event.types.part:
				Irc.onPart(event);
				break;

			case DataType.Event.types.ping:
				Irc.onPing(event);
				break;

			default: // TODO: implement all types
				break;
		}
	}

	static async onMessage(event) {
		console.log(event.toString());
		if (!Channel.isOnline(event.roomId)) {
			Commend.process(event);
		}
	}

	static async onUserstate(event) {}

	static async onUsernotice(event) {}

	static async onRoomstate(event) {
		Channel.setRules(event.roomId, {
			isEmoteOnly: event.isEmoteOnly,
			isSubOnly: event.isSubOnly,
			isFollowOnly: event.isFollowOnly,
			slow: event.slow,
			r9k: event.r9k
		});
	}

	static async onReconnect(event) {
		// try to reconnect after 5 seconds
		setTimeout(async () => {
			let socket = await Irc.connect('wss://irc-ws.chat.twitch.tv:443');
			Irc.#socket.close();
			Irc.#socket = socket;
			Channel.getConnectedNames().forEach((name) => {
				Irc.join(name);
			});
		}, 5 * 1000);
	}

	static async onJoin(event) {}

	static async onPart(event) {}

	static async onPing(event) {
		Irc.pong(event.source);
	}
}

/*  
    twitch event-sub manager [DEPRECATED]
*/

export class EventSub {
	static #socket;
	static #subs = {};
	static #session = {
		id: null,
		status: false, // boolean of whether the session is 'connected' or not
		time: null,
		timeout: null
	};

	static async init() {
		EventSub.#socket = await EventSub.connect('wss://eventsub.wss.twitch.tv/ws');
	}

	static async connect(url) {
		return new Promise((resolve, reject) => {
			let socket = new ws.WebSocket(url);

			socket.onopen = (response) => {
				resolve(socket);
			};

			socket.onmessage = (response) => {
				let data = JSON.parse(response.data);
				let event = DataType.SubEvent.create(data);
				EventSub.onEvent(event);
			};

			socket.onclose = (response) => {
				EventSub.#session.status = false;
			};
		});
	}

	static async createEventSub(type, version, condition, callback) {
		const request = {
			type: type,
			version: version,
			condition: condition,
			transport: {
				method: 'websocket',
				session_id: EventSub.#session.id
			}
		};

		console.log(request.transport);

		let response = await Client.Twitch.createEventSub(request);
		if (response.status == 202) {
			let sub = new DataType.EventSub(response.data.data[0], callback);
			EventSub.#subs[sub.id] = sub;
			return sub;
		}
	}

	static async removeEventSub(id) {
		let response = await Client.Twitch.deleteEventSub(id);
		if (response.status.code == 204) {
			delete EventSub.#subs[id];
		}
	}

	/*
        twitch event-sub event callbacks
    */

	static onEvent(event) {
		switch (event.type) {
			case DataType.SubEvent.types.welcome:
				EventSub.onWelcome(event);
				break;

			case DataType.SubEvent.types.keepalive:
				EventSub.onKeepalive(event);
				break;

			case DataType.SubEvent.types.reconnect:
				EventSub.onReconnect(event);
				break;

			case DataType.SubEvent.types.revoc:
				EventSub.onRevoc(event);
				break;

			case DataType.SubEvent.types.notif:
				EventSub.onNotif(event);
				break;

			default:
				break;
		}
	}

	static async onWelcome(event) {
		EventSub.#session = {
			id: event.sessionId,
			status: true, // TODO: implement some session status enum
			time: event.sessionTime,
			timeout: event.sessionTimeout
		};
	}

	static async onKeepalive(event) {}

	static async onReconnect(event) {
		let socket = await EventSub.connect(event.sessionReconnectUrl);
		EventSub.#socket.close();
		EventSub.#socket = socket;
	}

	static async onRevoc(event) {}

	static async onNotif(event) {
		let sub = EventSub.#subs[event.subId];
		sub.callback(event);
	}
}

/*  
    bot commend manager
*/

export class Commend {
	static #prefix = '$';
	static #commends = [];

	static createCommend(settings, callback) {
		let commend = new DataType.Commend(settings, callback);
		Commend.#commends.push(commend);
	}

	static checkPermissions(commend, event) {
		if (commend.rank > User.getRank(event.userId)) {
			console.log(User.getCachedName(event.userId), ` is under ranked`);
			return false; // user not authorized to use commend
		}
		if (commend.isCooldown(event.roomId, event.userId)) {
			console.log(User.getCachedName(event.userId), ` is under cooldown`);
			return false; // commend under cooldown
		} else if (commend.cooldown > 0) {
			commend.setCooldown(event.roomId, event.userId);
		}
		console.log(User.getCachedName(event.userId), ` is permitted`);
		return true;
	}

	static process(event) {
		Commend.#commends.forEach((commend) => {
			let words = event.message.split(' ');
			let hasCommend = words[0].toLowerCase() == Commend.#prefix + commend.name;
			let hasPermissions = Commend.checkPermissions(commend, event);
			if (hasCommend && hasPermissions) {
				commend.callback.call(commend, event);
			}
		});
	}

	/*
		helper functions:
	*/

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

export class Channel {
	static #channels = {};
	static #idCache = {};

	static init() {
		// some file/DB loading functions and shit

		// checks for if channels are online/offline
		setInterval(Channel.checkOnline, 1 * 60 * 1000);
	}

	static async createChannel(id, name = null) {
		if (!name) {
			name = await Channel.getApiName(id);
		}
		let channel = new DataType.Channel(id, name.toLowerCase());
		Channel.#channels[id] = channel;
		Channel.#idCache[name] = id;
	}

	static deleteChannel(id) {
		if (!Channel.#channels[id]) {
			return;
		}
		let name = Channel.#channels[id].name;
		delete Channel.#idCache[name];
		delete Channel.#channels[id];
	}

	static checkOnline() {
		let connectedIds = Channel.getConnectedIds();
		connectedIds.forEach(async (id) => {
			Channel.#channels[id].isOnline = await Channel.isOnlineApi(id);
		});
	}

	/*
		twitch irc connection calls:
	*/

	static async joinChannel(id, name = null) {
		if (!Channel.#channels[id]) {
			await Channel.createChannel(id, name);
		}
		Channel.#channels[id].isConnected = true;
	}

	static partChannel(id) {
		if (!Channel.#channels[id]) {
			return;
		}
		Channel.#channels[id].isConnected = false;
	}

	/*
		setters:
	*/

	static setRules(id, rules) {
		if (!Channel.#channels[id]) {
			return;
		}
		Channel.#channels[id].isEmoteOnly = rules.isEmoteOnly;
		Channel.#channels[id].isSubOnly = rules.isSubOnly;
		Channel.#channels[id].isFollowOnly = rules.isFollowOnly;
		Channel.#channels[id].slow = rules.slow;
		Channel.#channels[id].r9k = rules.r9k;
	}

	static setNameChange(id, newName) {
		if (!Channel.#channels[id]) {
			return;
		}
		let curName = Channel.#channels[id].name;
		delete Channel.#idCache[curName];
		Channel.#idCache[newName] = id;
		Channel.#channels[id].name = newName;
	}

	static setOnlineStatus(id, status) {
		Channel.#channels[id].isOnline = status;
	}

	/*
		getters:
	*/

	static getChannelNames() {
		return Object.keys(Channel.#idCache);
	}

	static getChannelIds() {
		return Object.keys(Channel.#channels);
	}

	static getConnectedNames() {
		let names = [];
		for (const [id, channel] of Object.entries(Channel.#channels)) {
			if (channel.isConnected) {
				names.push(channel.name);
			}
		}
		return names;
	}

	static getConnectedIds() {
		let ids = [];
		for (const [id, channel] of Object.entries(Channel.#channels)) {
			if (channel.isConnected) {
				ids.push(id);
			}
		}
		return ids;
	}

	static async getApiName(id) {
		let response = await Client.Twitch.getUserData({ id: id });
		if (response.status == 200) {
			let data = response.data.data[0];
			return data['login'];
		} else {
			return null;
		}
	}

	static async getApiId(name) {
		let response = await Client.Twitch.getUserData({ login: name });
		if (response.status == 200) {
			let data = response.data.data[0];
			return data['id'];
		} else {
			return null;
		}
	}

	static getCachedName(id) {
		// name is a lie, kinda (not from cache)
		return Channel.#channels[id]?.name;
	}

	static getCachedId(name) {
		return Channel.#idCache[name];
	}

	static isStartup(id) {
		return Channel.#channels[id]?.isStartup;
	}

	static isConnected(id) {
		return Channel.#channels[id]?.isConnected;
	}

	static async isOnlineApi(id) {
		let response = await Client.Twitch.getStreams({ user_id: id });
		return response.data.data.length != 0;
	}

	static isOnline(id) {
		return Channel.#channels[id]?.isOnline;
	}
}

/*
	user manager:
*/

export class User {
	static #users = {};
	static #idCache = {};

	static init() {
		// some file/DB loading functions and shit
	}

	static async createUser(id, name = null) {
		if (!name) {
			name = await User.getApiName(id);
		}
		let user = new DataType.User(id, name.toLowerCase());
		User.#users[id] = user;
		User.#idCache[name] = id;
	}

	static deleteUser(id) {
		if (!User.#users[id]) {
			return;
		}
		let name = User.#users[id].name;
		delete User.#idCache[name];
		delete User.#users[id];
	}

	/*
		setters:
	*/

	static async setRank(id, rank) {
		if (!User.#users[id]) {
			await User.createUser(id);
		}
		User.#users[id].rank = rank;
	}

	static async setPoints(id, points) {
		if (!User.#users[id]) {
			await User.createUser(id);
		}
		User.#users[id].points = points;
	}

	static async addPoints(id, points) {
		if (!User.#users[id]) {
			await User.createUser(id);
		}
		User.#users[id].points += points;
	}

	static async setNameChange(id, newName) {
		if (!User.#users[id]) {
			await User.createUser(id);
		}
		let curName = User.#users[id].name;
		delete User.#idCache[curName];
		User.#idCache[newName] = id;
		User.#users[id].name = newName;
	}

	/*
		getters:
	*/

	static getRank(id) {
		return User.#users[id]?.rank ?? DataType.Commend.ranks.default;
	}

	static getPoints(id) {
		return User.#users[id]?.points;
	}

	static getCachedName(id) {
		// name is a lie, kinda (not from cache)
		return User.#users[id]?.name;
	}

	static getCachedId(name) {
		return User.#idCache[name];
	}

	static async getApiName(id) {
		let response = await Client.Twitch.getUserData({ id: id });
		if (response.status == 200) {
			let data = response.data.data[0];
			return data['login'];
		} else {
			return null;
		}
	}

	static async getApiId(name) {
		let response = await Client.Twitch.getUserData({ login: name });
		if (response.status == 200) {
			let data = response.data.data[0];
			return data['id'];
		} else {
			return null;
		}
	}
}
