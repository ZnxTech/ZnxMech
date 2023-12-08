// @ts-nocheck

/**
 * @deprecated Sub-Event requires a user token to use, therefor I will not use it lol.
 * @module IrcClient
 * @author Daniel "Znx" Levi
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
