// @ts-ignore

/**
 * Contains a static manager class and data-struct classes
 * for maintaining a twitch irc connection.
 * @module IrcClient
 * @author Daniel "Znx" Levi
 */

/** Imports: */
import 'dotenv/config';
import WebSocket from 'ws';
import CommandManager from '../managers/commands.js';
import { Repost } from '../managers/triggers.js';
import Database, { User, Channel } from '../database/database.js';
import Twitch from './twitch.js';

const KnownBots = ['StreamElements', 'FossaBot', 'l3lackshark', 'sheppsubot', 'PogpegaBot', 'ZnxMech'];

/**
 *
 */
export default class IrcClient {
	/**
	 * The Twitch IRC websocket.
	 * @type {WebSocket}
	 * @static
	 */
	static #socket;

	/**
	 * Initializes a connection to the Twitch IRC.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async init() {
		IrcClient.#socket = await IrcClient.connect();
		const channels = await Channel.findAll({ where: { connected: true } });
		for (const channel of channels) {
			IrcClient.join(channel['name']);
		}
	}

	/**
	 * Creates and connects a websocket to the url provided, returns websocket on open.
	 * @returns {Promise<WebSocket>} The connected websocket.
	 * @static
	 * @method
	 */
	static async connect() {
		return new Promise((resolve, reject) => {
			let socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

			/** OnOpen function */
			socket.onopen = (event) => {
				socket.send(`PASS oauth:${process.env.BOT_OAUTH}`);
				socket.send(`NICK ${process.env.BOT_NICK}`);
				socket.send(`CAP REQ :twitch.tv/commands twitch.tv/tags`);
				resolve(socket);
			};

			/** OnMessage function */
			socket.onmessage = (event) => {
				const data = event.data;
				if (typeof data == 'string') {
					const strings = data.slice(0, data.lastIndexOf('\r\n')).split('\r\n'); // '\r\n' spliting tomfoolery
					for (const string of strings) {
						let eventObj = Event.create(string);
						IrcClient.onEvent(eventObj);
					}
				}
			};
		});
	}

	/**
	 * Websocket functions:
	 * --------------------
	 */

	/**
	 * Joins a channel in the IRC.
	 * @param {string} channel - The channel's login name.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static join(channel) {
		IrcClient.#socket.send(`JOIN #${channel.toLowerCase()}`);
	}

	/**
	 * Parts a channel in the IRC.
	 * @param {string} channel - The channel's login name.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static part(channel) {
		IrcClient.#socket.send(`PART #${channel.toLowerCase()}`);
	}

	/**
	 * Tracks the last message sent to the IRC for rate limit
	 * bypass purposes in the 'message' method. :tf:
	 * @type {string}
	 * @static
	 * @ignore
	 */
	static #lastMessage = '';

	/**
	 * Sends a message in the IRC.
	 * @param {string} channelName - The channel's login name.
	 * @param {string} message - The message to send.
	 * @returns {Promise<void>} Returns a boolean of if the message was sent or not.
	 * @static
	 * @method
	 */
	static async message(channelName, message) {
		/** Check for channel offline/live permissions */
		const response = await Twitch.getUsers({ login: channelName });
		const id = response?.data.data[0]?.id;
		const channel = await Channel.findByPk(id);
		if (channel?.['offline'] ?? true) {
			// Channel is offline only, check for if the channel is live.
			const response = await Twitch.getStreams({ user_id: id });
			if (response?.data.data[0]) {
				return; // Channel is live, exit process.
			}
		}

		if (IrcClient.#lastMessage == message) {
			message += ' ⠀'; // trolling
		}
		IrcClient.#socket.send(`PRIVMSG #${channelName.toLowerCase()} :${message}`);
		IrcClient.#lastMessage = message;
	}

	/**
	 * Pongs the IRC.
	 * @param {string} source - The ping message source.
	 * @static
	 * @method
	 */
	static pong(source) {
		IrcClient.#socket.send(`PONG ${source}`);
	}

	/**
	 * IRC-event callbacks:
	 * --------------------
	 */

	/**
	 * The function to trigger when reciving an event from the IRC,
	 * currently only filters event to their type specific trigger functions.
	 * @param {Event} event - The event recived from the IRC.
	 * @returns {void}
	 * @static
	 * @method
	 */
	static onEvent(event) {
		switch (event.type) {
			case EventType.MESSAGE:
				IrcClient.onMessage(event);
				break;

			case EventType.USERNOTICE:
				IrcClient.onUserstate(event);
				break;

			case EventType.USERNOTICE:
				IrcClient.onUsernotice(event);
				break;

			case EventType.ROOMSTATE:
				IrcClient.onRoomstate(event);
				break;

			case EventType.RECONNECT:
				IrcClient.onReconnect(event);
				break;

			case EventType.JOIN:
				IrcClient.onJoin(event);
				break;

			case EventType.PART:
				IrcClient.onPart(event);
				break;

			case EventType.PING:
				IrcClient.onPing(event);
				break;

			default: // TODO: implement all event types
				break;
		}
	}

	/**
	 * The function to trigger when reciving a message event.
	 * @param {MessageEvent} event - The message event recived.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async onMessage(event) {
		console.log(event.toString());
		if (!KnownBots.includes(event.userCName)) {
			CommandManager.process(event); // Filter out known bots.
			Repost.process(event);
		}
	}

	/**
	 * The function to trigger when reciving an userstate event.
	 * @param {UserstateEvent} event - The userstate event recived.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async onUserstate(event) {}

	/**
	 * The function to trigger when reciving an usernotice event.
	 * @param {UsernoticeEvent} event - The usernotice event recived.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async onUsernotice(event) {}

	/**
	 * The function to trigger when reciving a roomstate event.
	 * @param {RoomstateEvent} event - The roomstate event recived.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async onRoomstate(event) {}

	/**
	 * The function to trigger when reciving a reconnect event.
	 * @param {ReconnectEvent} event - The reconnect event recived.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async onReconnect(event) {
		console.log('IRC reconnecting');
		// try to reconnect after 5 seconds
		setTimeout(async () => {
			let socket = await IrcClient.connect();
			IrcClient.#socket.close();
			IrcClient.#socket = socket;
			// get all connected channels from db
			const channels = await Channel.findAll({ where: { connected: true } });
			for (const channel of channels) {
				IrcClient.join(channel['name']);
			}
		}, 5 * 1000);
	}

	/**
	 * The function to trigger when reciving a join event.
	 * @param {JoinEvent} event - The join event recived.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async onJoin(event) {}

	/**
	 * The function to trigger when reciving a part event.
	 * @param {PartEvent} event - The part event recived.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async onPart(event) {}

	/**
	 * The function to trigger when reciving a ping event.
	 * @param {PingEvent} event - The ping event recived.
	 * @returns {Promise<void>}
	 * @static
	 * @method
	 */
	static async onPing(event) {
		IrcClient.pong(event.source);
	}
}

/**
 * Enum representing all IRC-event types.
 * ```
 * MESSAGE:    'PRIVMSG'
 * WHISPER:    'WHISPER'
 * USERSTATE:  'USERSTATE'
 * USERNOTICE: 'USERNOTICE'
 * ROOMSTATE:  'ROOMSTATE'
 * RECONNECT:  'RECONNECT'
 * NOTICE:     'NOTICE'
 * JOIN:       'JOIN'
 * PART:       'PART'
 * PING:       'PING'
 * ```
 * @enum {string}
 */
export const EventType = {
	MESSAGE: 'PRIVMSG',
	WHISPER: 'WHISPER',
	USERSTATE: 'USERSTATE',
	USERNOTICE: 'USERNOTICE',
	ROOMSTATE: 'ROOMSTATE',
	RECONNECT: 'RECONNECT',
	NOTICE: 'NOTICE',
	JOIN: 'JOIN',
	PART: 'PART',
	PING: 'PING'
};

/**
 * @classdesc Base IRC-event data-struct class, contains all event functionalities.
 */
export class Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 */
	constructor(raw, source, type) {
		/**
		 * The raw IRC data string.
		 * @type {string}
		 */
		this.raw = raw;

		/**
		 * The IRC source.
		 * @type {string}
		 */
		this.source = source;

		/**
		 * The IRC-event type
		 * @type {string}
		 */
		this.type = type;
	}

	/**
	 * Returns a new irc-event data-struct class instance.
	 * @param {string} string - a raw irc-event data string
	 * @returns {Event} an irc-event data-struct class.
	 * @static
	 * @method
	 */
	static create(string) {
		/** raw irc-data string parsing */
		const strings = string.split(' ');
		let index = 0;

		let tags = {};
		if (strings[index].charAt(0) == '@') {
			const rawTags = strings[index].slice(1).split(';');
			for (const rawTag of rawTags) {
				let pair = rawTag.split('=');
				tags[pair[0]] = pair[1];
			}
			index++;
		}

		let source = '';
		if (strings[index].charAt(0) == ':') {
			source = strings[index];
			index++;
		}

		const type = strings[index];
		const args = strings.slice(index + 1).filter((element) => element); // Filter empty strings out.

		/** raw irc-data class sorting */
		switch (type) {
			case EventType.MESSAGE:
				return new MessageEvent(string, source, type, tags, args);
				break;

			case EventType.USERSTATE:
				return new UserstateEvent(string, source, type, tags, args);
				break;

			case EventType.USERNOTICE:
				return new UsernoticeEvent(string, source, type, tags, args);
				break;

			case EventType.ROOMSTATE:
				return new RoomstateEvent(string, source, type, tags, args);
				break;

			case EventType.RECONNECT:
				return new ReconnectEvent(string, source, type, tags, args);
				break;

			case EventType.JOIN:
				return new JoinEvent(string, source, type, tags, args);
				break;

			case EventType.PART:
				return new PartEvent(string, source, type, tags, args);
				break;

			case EventType.PING:
				return new PingEvent(string, source, type, tags, args);
				break;

			default: // TODO: implement all types and remove/switch to null
				return new UndefinedEvent(string, source, type, tags, args);
				break;
		}
	}
}

/**
 * @classdesc Message IRC-event data-struct class.
 */
export class MessageEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);

		/** Assign tags */

		/**
		 * The user's twitch badges.
		 * @type {object}
		 */
		this.badges = {}; // key:number
		const rawBadges = tags['badges'].split(',');
		for (const rawBadge of rawBadges) {
			const pair = rawBadge.split('/');
			this.badges[pair[0]] = +pair[1];
		}

		/**
		 * The id of the message.
		 * @type {string}
		 */
		this.id = tags['id'];

		/**
		 * The time the message was sent in unix time.
		 * @type {number}
		 */
		this.time = +tags['tmi-sent-ts'];

		/**
		 * The id of the channel the message was sent in.
		 * @type {number}
		 */
		this.roomId = +tags['room-id'];

		/**
		 * The id of the user.
		 * @type {number}
		 */
		this.userId = +tags['user-id'];

		/**
		 * The user's name, uncapitalized.
		 * @type {string}
		 */
		this.userName = tags['display-name']?.toLowerCase?.();

		/**
		 * The user's name, capitalized.
		 * @type {string}
		 */
		this.userCName = tags['display-name'];

		/**
		 * The user's name color.
		 * @type {string}
		 */
		this.userColor = tags['color'];

		/**
		 * Boolean of whether or not the user is a moderator.
		 * @type {boolean}
		 */
		this.isMod = !!+tags['mod'];

		/**
		 * Boolean of whether or not the user is a subscriber.
		 * @type {boolean}
		 */
		this.isSub = !!+tags['subscriber'];

		/**
		 * Boolean of whether or not the user has turbo.
		 * @type {boolean}
		 */
		this.isTurbo = !!+tags['turbo'];

		/** Assign args */

		/**
		 * The channel the message was sent in.
		 * @type {string}
		 */
		this.channel = args[0].replace('#', '');

		/**
		 * The message.
		 * @type {string}
		 */
		this.message = args.slice(1).join(' ').replace(':', '');
	}

	/**
	 * Returns a representation of the event as a string.
	 * @returns {string} Message event in string form.
	 * @method
	 */
	toString() {
		let badges = [];
		if (this.isMod) {
			badges.push(`[M]`);
		}
		if (this.isSub) {
			badges.push(`[S]`);
		}
		return `#${this.channel} ${badges.join('')}${this.userName}: ${this.message}`;
	}
}

/**
 * @classdesc Userstate IRC-event data-struct class.
 */
export class UserstateEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);

		/** Assign tags */

		/**
		 * The user's twitch badges.
		 * @type {object}
		 */
		this.badges = {}; // key:number
		const rawBadges = tags['badges'].split(',');
		for (const rawBadge of rawBadges) {
			const pair = rawBadge.split('/');
			this.badges[pair[0]] = +pair[1];
		}

		/**
		 * The user's name, uncapitalized.
		 * @type {string}
		 */
		this.userName = tags['display-name']?.toLowerCase?.();

		/**
		 * The user's name, capitalized.
		 * @type {string}
		 */
		this.userCName = tags['display-name'];

		/**
		 * The user's name color.
		 * @type {string}
		 */
		this.userColor = tags['color'];

		/**
		 * Boolean of whether or not the user is a moderator.
		 * @type {boolean}
		 */
		this.isMod = !!+tags['mod'];

		/**
		 * Boolean of whether or not the user is a subscriber.
		 * @type {boolean}
		 */
		this.isSub = !!+tags['subscriber'];

		/**
		 * Boolean of whether or not the user has turbo.
		 * @type {boolean}
		 */
		this.isTurbo = !!+tags['turbo'];

		/** Assign args */

		/**
		 * The channel name the userstate was sent in.
		 * @type {string}
		 */
		this.channel = args[0].replace('#', '');
	}
}

/**
 * @classdesc Usernotice IRC-event data-struct class.
 */
export class UsernoticeEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);

		/** Assign tags */

		/**
		 * The user's twitch badges.
		 * @type {object}
		 */
		this.badges = {}; // key:number
		const rawBadges = tags['badges'].split(',');
		for (const rawBadge of rawBadges) {
			const pair = rawBadge.split('/');
			this.badges[pair[0]] = +pair[1];
		}

		/**
		 * The id of the message.
		 * @type {string}
		 */
		this.id = tags['id'];

		/**
		 * The time the message was sent in unix time.
		 * @type {number}
		 */
		this.time = +tags['tmi-sent-ts'];

		/**
		 * The id of the channel the usernotice was sent in.
		 * @type {number}
		 */
		this.roomId = +tags['room-id'];

		/**
		 * The id of the user.
		 * @type {number}
		 */
		this.userId = +tags['user-id'];

		/**
		 * The user's name, uncapitalized.
		 * @type {string}
		 */
		this.userName = tags['display-name']?.toLowerCase?.();

		/**
		 * The user's name, capitalized.
		 * @type {string}
		 */
		this.userCName = tags['display-name'];

		/**
		 * The user's name color.
		 * @type {string}
		 */
		this.userColor = tags['color'];

		/**
		 * Boolean of whether or not the user is a moderator.
		 * @type {boolean}
		 */
		this.isMod = !!+tags['mod'];

		/**
		 * Boolean of whether or not the user is a subscriber.
		 * @type {boolean}
		 */
		this.isSub = !!+tags['subscriber'];

		/**
		 * Boolean of whether or not the user has turbo.
		 * @type {boolean}
		 */
		this.isTurbo = !!+tags['turbo'];

		/**
		 * The type of usernotice.
		 * @type {string}
		 */
		this.noticeType = tags['msg-id'];

		/**
		 * The usernotice message.
		 * @type {string}
		 */
		this.noticeMessage = tags['system-msg'];

		/** Assign args */

		/**
		 * The channel name the usernotice was sent in.
		 * @type {string}
		 */
		this.channel = args[0].replace('#', '');

		/**
		 * The message the user sent with the notice.
		 * @type {string}
		 */
		this.message = args.slice(1).join(' ').replace(':', '');
	}
}

/**
 * @classdesc Roomstate IRC-event data-struct class.
 */
export class RoomstateEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);

		/** Assign tags */

		/**
		 * The id of the channel the roomstate was sent in.
		 * @type {number}
		 */
		this.roomId = +tags['room-id'];

		/**
		 * Boolean of whether or not the room is in emote only mode.
		 * @type {boolean}
		 */
		this.isEmoteOnly = !!+tags['emote-only'];

		/**
		 * Boolean of whether or not the room is in subscriber only mode.
		 * @type {boolean}
		 */
		this.isSubOnly = !!+tags['subs-only'];

		/**
		 * The number of minutes followed required to send messages, -1 if disabled.
		 * @type {number}
		 */
		this.isFollowOnly = +tags['followers-only'];

		/**
		 * The number of seconds required to wait to send another message.
		 * @type {number}
		 */
		this.slow = +tags['slow'];

		/**
		 * Boolean of whether or not the room is in r9k unique messages mode.
		 * @type {boolean}
		 */
		this.r9k = !!+tags['r9k'];

		/** Assign args */

		/**
		 * The name of the channel the roomstate was sent in.
		 * @type {string}
		 */
		this.channel = args[0].replace('#', '');
	}
}

/**
 * @classdesc Roomstate IRC-event data-struct class.
 */
export class ReconnectEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);
		/** kinda empty lol */
	}
}

/**
 * @classdesc Join IRC-event data-struct class.
 */
export class JoinEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);

		/** Assign args */

		/**
		 * The name of the channel.
		 * @type {string}
		 */
		this.channel = args[0].replace('#', '');
	}
}

/**
 * @classdesc Part IRC-event data-struct class.
 */
export class PartEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);

		/** Assign args */

		/**
		 * The name of the channel.
		 * @type {string}
		 */
		this.channel = args[0].replace('#', '');
	}
}

/**
 * @classdesc Ping IRC-event data-struct class.
 */
export class PingEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);

		/** Assign args */

		/**
		 * The IRC source.
		 * @type {string}
		 */
		this.source = args[0]; // source appears after command, bruh
	}
}

/**
 * @classdesc Undefined IRC-event data-struct class.
 */
export class UndefinedEvent extends Event {
	/**
	 * @param {string} raw - The raw IRC data string.
	 * @param {string} source - The IRC source.
	 * @param {EventType} type - The IRC-event type.
	 * @param {object} tags - The IRC-event tags.
	 * @param {string[]} args - The IRC-event arguments.
	 * @constructor
	 */
	constructor(raw, source, type, tags, args) {
		super(raw, source, type);

		/**
		 * The IRC-event tags.
		 * @type {object}
		 */
		this.tags = tags;

		/**
		 * The IRC-event arguments.
		 * @type {string[]}
		 */
		this.args = args;
	}
}

/** Initialize on import */
await IrcClient.init();
