// @ts-check

/**
 * Main.
 * @author Daniel "Znx" Levi
 */

/** Imports: */
import 'dotenv/config';

import IrcClient, { EventType } from './clients/irc.js';
import Twitch from './clients/twitch.js';

import CommandManager, { Rank } from './managers/commands.js';
import Database, { Channel } from './database/database.js';

import OsuMemory from './clients/osumemory.js';

/**
 * Command definitions:
 * --------------------
 */

/**
 * Admin Commands:
 */

CommandManager.create(
	{
		triggers: ['join'],
		rank: Rank.ADMIN,
		cooldown: 0,
		args: {
			offline: {
				triggers: ['offline', 'o'],
				isValued: false
			}
		}
	},
	async (event, args) => {
		/** Main argument is the channel name to connect to */
		const name = args.main?.value;

		console.log(args);

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
		IrcClient.message(event.channel, `/me Joined ${name}`);
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
				IrcClient.message(event.channel, `/me Left ${name}`);
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

/**
 * Main Commands
 */

CommandManager.create(
	{
		triggers: ['nowplaying', 'np'],
		cooldown: 1 * 1000,
		whitelist: ['znxtech', 'znxmech']
	},
	async (event, args) => {
		let npString = await OsuMemory.getNpString();
		IrcClient.message(event.channel, npString);
	}
);

CommandManager.create(
	{
		triggers: ['roll', 'r'],
		cooldown: 1 * 1000,
		args: {
			min: {
				triggers: ['min', 'm'],
				isValued: true
			}
		}
	},
	(event, args) => {
		/** Command defaults */
		let max = 100;
		let min = 0;

		if (args.main.triggered) {
			max = Number(args.main.value);
		}
		if (args.min.triggered) {
			min = Number(args.min.value);
		}

		IrcClient.message(event.channel, `@${event.userCName} ${Math.floor(min + Math.random() * (max - min))}`);
	}
);

/**
 * Text only commands:
 */

// Mainly for testing
CommandManager.create(
	{
		triggers: ['hey', 'hello', 'hi'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, `FeelsOkayMan Hey ${event.userCName}`);
	}
);

// Help command
CommandManager.create(
	{
		triggers: ['help', 'h'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, 'Idk read this https://github.com/ZnxTech/ZnxMech/blob/main/index.js');
	}
);

// For tonker manana :3c
CommandManager.create(
	{
		triggers: ['tasty'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, `Tasty`);
	}
);

// Fuck this emote fr.
CommandManager.create(
	{
		triggers: ['fuckta'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, `ta filter: r"!(message.content match r"^((ta|tuh) *)+.*$")"`);
	}
);

// Source link
CommandManager.create(
	{
		triggers: ['source', 'sourcecode', 'repo', 'git'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, 'https://github.com/ZnxTech/ZnxMech');
	}
);

/**
 * GregTech/Own Channel Commands:
 */

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
		triggers: ['angelica'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, 'Angelica (Forge 1.7.10 Sodium): https://github.com/GTNewHorizons/Angelica');
	}
);

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
