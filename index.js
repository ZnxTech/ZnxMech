// @ts-check

/**
 * Main.
 * @author Daniel "Znx" Levi
 */

/** Imports: */
import 'dotenv/config';

import IrcClient, { EventType } from './clients/irc.js';
import Twitch from './clients/twitch.js';

import CommandManager, { Rank, ArgValue } from './managers/commands.js';
import Database, { Channel } from './database/database.js';
import { Counter } from './managers/misctools.js';

/**
 * Command definitions:
 * --------------------
 */

CommandManager.create(
	{
		triggers: ['hey', 'hello', 'hi'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, `/me FeelsOkayMan Hey ${event.userCName}`);
	}
);

CommandManager.create(
	{
		triggers: ['tasty'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, `Tasty !`);
	}
);

CommandManager.create(
	{
		triggers: ['roll', 'r'],
		cooldown: 1 * 1000,
		args: {
			maxRoll: {
				triggers: ['number', 'n'],
				type: ArgValue.NUMBER
			}
		}
	},
	(event, args) => {
		var max = 1000;
		if (args.maxRoll.triggered) {
			max = Number(args.maxRoll.value);
		}
		IrcClient.message(event.channel, `@${event.userCName} ${Math.floor(Math.random() * max)}`);
	}
);

CommandManager.create(
	{
		triggers: ['source', 'sourcecode', 'repo', 'git'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, 'https://github.com/ZnxTech/ZnxMech');
	}
);

CommandManager.create(
	{
		triggers: ['tmods'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(
			event.channel,
			'playing calamity with some other qol mods on master revengeance mode https://pastebin.com/iXiL8MsX'
		);
	}
);

CommandManager.create(
	{
		triggers: ['rwg'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, 'reverted RWG: https://znx.s-ul.eu/CDZAq0hz');
	}
);

CommandManager.create(
	{
		triggers: ['angelica'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, 'Angelica (Forge 1.7.10 Sodium): https://github.com/GTNewHorizons/Angelica');
	}
);

//CommandManager.create(
//	{
//		triggers: ['counter'],
//		rank: Rank.ADMIN,
//		cooldown: 10 * 1000,
//		args: {
//			reset: {
//				triggers: ['reset', 'r'],
//				type: ArgValue.NULL
//			},
//			delete: {
//				triggers: ['delete', 'd'],
//				type: ArgValue.NULL
//			},
//			nuke: {
//				triggers: ['nuke', 'n'],
//				type: ArgValue.NULL
//			}
//		}
//	},
//	(event, args) => {
//		// work on this later lol, too lazy.
//		if (1 === 1) {
//			return; // IDE wont shut up for having just return instead of this.
//		}
//
//		/** Check nuke argument */
//		if (args.nuke?.triggered) {
//			/** Nuke all counters */
//			Counter.nuke();
//			IrcClient.message(event.channel, '/me all counters deleted. RIPBOZO');
//			return; // Counters nuked, exit.
//		}
//
//		/** Check for main argument string */
//		if (typeof args.main?.value != 'string') {
//			/** No main argument provided, exit */
//			IrcClient.message(event.channel, '/me counter name not provided.');
//			return; // No main argument, exit.
//		}
//
//		/** Parse name and regex */
//		const match = args.main.value.match(/[^\/]*/g);
//
//		const name = match?.[0] ?? '';
//		const pattern = match?.[1];
//		const flags = match?.[2];
//
//		if (args.delete?.triggered) {
//			/** Delete the provided counter */
//			Counter.delete(name);
//			IrcClient.message(event.channel, `/me ${name} counter deleted.`);
//			return; // Counter deleted, exit.
//		}
//
//		if (args.reset?.triggered) {
//			/** Reset the provided counter */
//			Counter.reset(name);
//		}
//
//		/** Create RegExp */
//		// const regex = new RegExp(pattern, flags);
//	}
//);

CommandManager.create(
	{
		triggers: ['gregtech', 'gtnh', 'greg'],
		cooldown: 10 * 1000
	},
	async (event, args) => {
		IrcClient.message(
			event.channel,
			`GregTech is a technology and chemistry mod focused on realistic crafting process chains: https://gregtech.overminddl1.com/ 
			GTNH is a modpack based on GregTech-5U that takes around 7k-10k hours to finish (StarGate tier): https://github.com/GTNewHorizons/GT-New-Horizons-Modpack`
		);
	}
);

CommandManager.create(
	{
		triggers: ['prism', 'prismlauncher', 'getprism'],
		cooldown: 10 * 1000
	},
	async (event, args) => {
		IrcClient.message(
			event.channel,
			`Stop using the CurseForge launcher! use Prism launcher instead: https://prismlauncher.org/`
		);
	}
);

CommandManager.create(
	{
		triggers: ['key', 'apikey', 'curseforgekey'],
		cooldown: 10 * 1000
	},
	async (event, args) => {
		IrcClient.message(
			event.channel,
			`CurseForge API key: $2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm`
		);
	}
);

CommandManager.create(
	{
		triggers: ['join'],
		rank: Rank.ADMIN,
		cooldown: 0,
		args: {
			offline: {
				triggers: ['offline', 'o'],
				type: ArgValue.NULL
			}
		}
	},
	async (event, args) => {
		/** Main argument is the channel name to connect to */
		const name = args.main?.value;

		/** Check if string */
		if (typeof name != 'string') {
			/** No main argument (channel name) provided, null */
			IrcClient.message(event.channel, '/me channel name not provided.');
			return;
		}

		/** Request Twitch for channel ID */
		const response = await Twitch.getUsers({ login: name });
		const id = response?.data.data[0]?.id;

		/** Check if id returned is valid */
		if (!id) {
			/** Channel name doesnt exist on Twitch */
			IrcClient.message(event.channel, '/me invalid channel name.');
			return;
		}

		/** Obtain channel model from database, or build it if it doesnt exist on the database */
		const [user, built] = await Channel.findOrBuild({ where: { id: id }, defaults: { name: name } });
		/** Set connection status to true */
		user['isConnected'] = true;
		/** Set offline only status */
		user['isOfflineOnly'] = args.offline?.triggered;
		/** Save channel model to database */
		await user.save();
		/** Join channel in IRC */
		IrcClient.join(name);
	}
);

CommandManager.create(
	{
		triggers: ['part', 'leave'],
		rank: Rank.ADMIN,
		cooldown: 0
	},
	async (event, args) => {
		/** Main argument is the channel name to connect to */
		const name = args.main?.value;

		/** Check if string */
		if (typeof name == 'string') {
			/** Request Twitch for channel ID */
			const response = await Twitch.getUsers({ login: name });
			const id = response?.data.data[0]?.id;

			/** Check if id returned is valid */
			if (id) {
				/** Obtain channel model from database, or build it if it doesnt exist on the database */
				const [user, built] = await Channel.findOrBuild({ where: { id: id }, defaults: { name: name } });
				/** Set connection status to false */
				user['isConnected'] = false;
				/** Part channel in IRC */
				IrcClient.part(name);
				/** Save channel model to database */
				await user.save();
			} else {
				/** Channel name doesnt exist on Twitch */
				IrcClient.message(event.channel, '/me invalid channel name.');
			}
		} else {
			/** No main argument (channel name) provided, null */
			IrcClient.message(event.channel, '/me channel name not provided.');
		}
	}
);
