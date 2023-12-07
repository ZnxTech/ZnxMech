// @ts-check

/**
 * Main.
 * @author Daniel "Znx" Levi <LeviDaniel2610@gmail.com>
 */

/** Imports: */
import 'dotenv/config';

import IrcClient, { EventType } from './clients/irc.js';
import Twitch from './clients/twitch.js';

import ChannelManager from './managers/channels.js';
import UserManager from './managers/users.js';
import CommendManager, { Rank } from './managers/commends.js';

/**
 * Commend definitions:
 * --------------------
 */

CommendManager.create(
	{
		triggers: ['hey', 'hello', 'hi'],
		cooldown: 10 * 1000
	},
	(event) => {
		IrcClient.sendMessage(event.channel, `/me FeelsOkayMan Hey ${event.userCName}`);
	}
);

CommendManager.create(
	{
		triggers: ['source', 'code', 'repo', 'git'],
		cooldown: 10 * 1000
	},
	(event) => {
		IrcClient.sendMessage(event.channel, 'https://github.com/ZnxTech/ZnxMech');
	}
);

CommendManager.create(
	{
		triggers: ['join'],
		rank: Rank.ADMIN,
		cooldown: 0
	},
	async (event) => {
		console.log('triggered join');
		const name = event.message.split(' ')[1]?.toLowerCase();
		const response = await Twitch.getUsers({ login: name });
		console.log(response);
		if (response) {
			const id = response.data.data[0].id;
			await ChannelManager.joinChannel(id, name);
			IrcClient.sendMessage(name, '/me joined.');
		} else {
			IrcClient.sendMessage(event.channel, '/me invalid channel.');
		}
	}
);

CommendManager.create(
	{
		triggers: ['part', 'leave'],
		rank: Rank.ADMIN,
		cooldown: 0
	},
	async (event) => {
		console.log('triggered part');
		const name = event.message.split(' ')[1]?.toLowerCase();
		const response = await Twitch.getUsers({ login: name });
		if (response) {
			const id = response.data.data[0].id;
			IrcClient.sendMessage(name, '/me left.');
			ChannelManager.partChannel(id);
		} else {
			IrcClient.sendMessage(event.channel, '/me invalid channel.');
		}
	}
);

/**
 * Initializes all managers and clients:
 * -------------------------------------
 */

await IrcClient.init();
await Twitch.init();

ChannelManager.init();
UserManager.init();

/**
 * Sets default bot settings:
 * --------------------------
 */

// Joins ZnxMech.
//@ts-ignore
ChannelManager.joinChannel(+process.env.BOT_ID, process.env.BOT_NICK?.toLowerCase());

// Sets ZnxTech & ZnxMech as owners.
//@ts-ignore
UserManager.setRank(+process.env.OWNER_ID, Rank.OWNER);
//@ts-ignore
UserManager.setRank(+process.env.BOT_ID, Rank.OWNER);
