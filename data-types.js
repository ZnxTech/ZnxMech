/*
    data-types.js : [DataType]
    --------------------------
    irc-events:
        @class Event
        @enum  | types
        @func  | create()
        @class | MessageEvent
        @func  | | toString()
        @class | UserStateEvent
        @class | RoomStateEvent
        @class | JoinEvent
        @class | PartEvent
        @class | PingEvent
        @class | UndefinedEvent

    sub-events:
        @class SubEvent
        @enum  | types
        @func  | create()
        @class | WelcomeSubEvent
        @class | KeepaliveSubEvent
        @class | ReconnectSubEvent
        @class | RevocSubEvent
        @class | NotifSubEvent

    bot-types:
        @class User // TODO
        @class Channel
        @class Commend
        @enum  | ranks
        @func  | isCooldown()
        @func  | setCooldown() 
        @class EventSub
*/

/*
    irc data-types:
*/

export class Event {
	constructor(data) {
		this.raw = data.raw;
		this.source = data.source;
		this.type = data.type;
	}

	static types = {
		message: 'PRIVMSG',
		whisper: 'WHISPER',
		userstate: 'USERSTATE',
		usernotice: 'USERNOTICE',
		roomstate: 'ROOMSTATE',
		notice: 'NOTICE',
		join: 'JOIN',
		part: 'PART',
		ping: 'PING'
	};

	static create(data) {
		switch (data.type) {
			case Event.types.message:
				return new MessageEvent(data);
				break;

			case Event.types.userstate:
				return new UserstateEvent(data);
				break;

			case Event.types.usernotice:
				return new UsernoticeEvent(data);
				break;

			case Event.types.roomstate:
				return new RoomstateEvent(data);
				break;

			case Event.types.reconnect:
				return new ReconnectEvent(data);
				break;

			case Event.types.join:
				return new JoinEvent(data);
				break;

			case Event.types.part:
				return new PartEvent(data);
				break;

			case Event.types.ping:
				return new PingEvent(data);
				break;

			default: // TODO: implement all types and remove/switch to null
				return new UndefinedEvent(data);
				break;
		}
	}
}

export class MessageEvent extends Event {
	constructor(data) {
		super(data);

		// assign tags
		this.badges = {}; // key:number
		let rawBadges = data.tags['badges'].split(',');
		rawBadges.forEach((rawBadge) => {
			let pair = rawBadge.split('/');
			this.badges[pair[0]] = +pair[1];
		});

		this.id = data.tags['id'];
		this.time = +data.tags['tmi-sent-ts']; // number
		this.roomId = +data.tags['room-id']; // number
		this.userId = +data.tags['user-id']; // number
		this.userName = data.tags['display-name'];
		this.userColor = data.tags['color'];
		this.isMod = !!+data.tags['mod']; // boolean
		this.isSub = !!+data.tags['subscriber']; // boolean
		this.isTurbo = !!+data.tags['turbo']; // boolean

		// assign args
		this.channel = data.args[0].replace('#', '');
		let rawMessage = data.args.slice(1);
		this.message = rawMessage.join(' ').replace(':', '');
	}

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

export class UserstateEvent extends Event {
	constructor(data) {
		super(data);

		// assign tags
		this.badges = {}; // key:number
		let rawBadges = data.tags['badges'].split(',');
		rawBadges.forEach((rawBadge) => {
			let pair = rawBadge.split('/');
			this.badges[pair[0]] = +pair[1];
		});

		this.userName = data.tags['display-name'];
		this.userColor = data.tags['color'];
		this.isMod = !!+data.tags['mod']; // boolean
		this.isSub = !!+data.tags['subscriber']; // boolean
		this.isTurbo = !!+data.tags['turbo']; // boolean

		// assign args
		this.channel = data.args[0].replace('#', '');
	}
}

export class UsernoticeEvent extends Event {
	constructor(data) {
		super(data);

		// assign tags
		this.badges = {}; // key:number
		let rawBadges = data.tags['badges'].split(',');
		rawBadges.forEach((rawBadge) => {
			let pair = rawBadge.split('/');
			this.badges[pair[0]] = +pair[1];
		});

		this.id = data.tags['id'];
		this.time = +data.tags['tmi-sent-ts']; // number
		this.roomId = +data.tags['room-id']; // number
		this.userId = +data.tags['user-id']; // number
		this.userName = data.tags['display-name'];
		this.userColor = data.tags['color'];
		this.isMod = !!+data.tags['mod']; // boolean
		this.isSub = !!+data.tags['subscriber']; // boolean
		this.isTurbo = !!+data.tags['turbo']; // boolean

		this.noticeType = data.tags['msg-id'];
		this.noticeMessage = data.tags['system-msg'];

		// assign args
		this.channel = data.args[0].replace('#', '');
		let rawMessage = data.args.slice(1);
		this.message = rawMessage.join(' ').replace(':', '');
	}
}

export class RoomstateEvent extends Event {
	constructor(data) {
		super(data);

		// assign tags
		this.roomId = +data.tags['room-id'];
		this.isEmoteOnly = !!+data.tags['emote-only']; // boolean
		this.isSubOnly = !!+data.tags['subs-only']; // boolean
		this.isFollowOnly = +data.tags['followers-only']; // number
		this.slow = +data.tags['slow']; // number
		this.r9k = !!+data.tags['r9k']; // boolean

		// assign args
		this.channel = data.args[0].replace('#', '');
	}
}

export class ReconnectEvent extends Event {
	constructor(data) {
		super(data);

		// kinda empty lol
	}
}

export class JoinEvent extends Event {
	constructor(data) {
		super(data);

		// assign args
		this.channel = data.args[0].replace('#', '');
	}
}

export class PartEvent extends Event {
	constructor(data) {
		super(data);

		// assign args
		this.channel = data.args[0].replace('#', '');
	}
}

export class PingEvent extends Event {
	constructor(data) {
		super(data);

		this.source = data.args[0]; // source appears after commend
		data.args = [];
	}
}

export class UndefinedEvent extends Event {
	constructor(data) {
		super(data);

		this.tags = data.tags;
		this.args = data.args;
	}
}

/*
    event-sub data-types:
*/

export class SubEvent {
	constructor(data) {
		this.id = data.metadata['message_id'];
		this.type = data.metadata['message_type'];
		this.time = data.metadata['message_timestamp'];
	}

	static types = {
		welcome: 'session_welcome',
		keepalive: 'session_keepalive',
		reconnect: 'session_reconnect',
		revoc: 'revocation',
		notif: 'notification'
	};

	static create(data) {
		switch (data.metadata?.['message_type']) {
			case SubEvent.types.welcome:
				return new WelcomeSubEvent(data);
				break;

			case SubEvent.types.keepalive:
				return new KeepaliveSubEvent(data);
				break;

			case SubEvent.types.reconnect:
				return new ReconnectSubEvent(data);
				break;

			case SubEvent.types.revoc:
				return new RevocSubEvent(data);
				break;

			case SubEvent.types.notif:
				return new NotifSubEvent(data);
				break;

			default:
				return null;
				break;
		}
	}
}

export class WelcomeSubEvent extends SubEvent {
	constructor(data) {
		super(data);

		this.sessionId = data.payload.session['id'];
		this.sessionStatus = data.payload.session['status'];
		this.sessionTime = data.payload.session['connected_at'];
		this.sessionTimeout = +data.payload.session['keepalive_timeout_seconds']; // number
		this.sessionReconnectUrl = data.payload.session['reconnect_url'];
	}
}

export class KeepaliveSubEvent extends SubEvent {
	constructor(data) {
		super(data);

		// kinda empty lol
	}
}

export class ReconnectSubEvent extends SubEvent {
	constructor(data) {
		super(data);

		this.sessionId = data.payload.session['id'];
		this.sessionStatus = data.payload.session['status'];
		this.sessionTime = data.payload.session['connected_at'];
		this.sessionTimeout = +data.payload.session['keepalive_timeout_seconds']; // number
		this.sessionReconnectUrl = data.payload.session['reconnect_url'];
	}
}

export class RevocSubEvent extends SubEvent {
	constructor(data) {
		super(data);

		this.subType = data.metadata['subscription_type'];
		this.subVersion = +data.metadata['subscription_version']; // number

		this.subId = data.payload.subscription['id'];
		this.subStatus = data.payload.subscription['status'];
		this.subCost = +data.payload.subscription['cost']; // number
		this.subCondition = data.payload.subscription['condition'];
		this.subTransport = data.payload.subscription['transport'];
		this.subTime = data.payload.subscription['created_at'];
	}
}

export class NotifSubEvent extends SubEvent {
	constructor(data) {
		super(data);

		this.subType = data.metadata['subscription_type'];
		this.subVersion = +data.metadata['subscription_version']; // number

		this.subId = data.payload.subscription['id'];
		this.subStatus = data.payload.subscription['status'];
		this.subCost = +data.payload.subscription['cost']; // number
		this.subCondition = data.payload.subscription['condition'];
		this.subTransport = data.payload.subscription['transport'];
		this.subTime = data.payload.subscription['created_at'];

		this.subEvent = data.payload.event; // the event of a sub, not an event-sub event
	}
}

/*
    bot data-types:
*/

// TODO
export class User {
	constructor(id, name) {
		this.id = id;
		this.name = name;

		this.rank = Commend.ranks.default;
		this.points = 0;
	}
}

export class Channel {
	constructor(id, name) {
		this.id = id;
		this.name = name;

		// channel rules, assigned at roomstate event
		this.isEmoteOnly = null;
		this.isSubOnly = null;
		this.isFollowOnly = null;
		this.slow = null;
		this.r9k = null;

		// channel connections
		this.isStartup = false;
		this.isConnected = false;
		this.isOnline = null;
		this.eventSubIds = []; // offline & online event-sub ids
	}
}

export class Commend {
	constructor(settings, callback) {
		this.name = settings.name;
		this.rank = settings.rank ?? Commend.ranks.default;
		this.cooldown = settings.cooldown ?? 0; // time in ms
		this.cooldowns = {};
		this.callback = callback;
	}

	static ranks = {
		banned: -1,
		default: 0,
		trusted: 1,
		admin: 2,
		owner: 3
	};

	// rank check func here

	isCooldown(roomId, userId) {
		return this.cooldowns[roomId]?.[userId] ?? false;
	}

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

export class EventSub {
	constructor(data, callback) {
		this.id = data['id'];
		this.type = data['type'];
		this.version = data['version'];
		this.cost = +data['cost']; // number
		this.condition = data['condition'];

		this.callback = callback;
	}
}
