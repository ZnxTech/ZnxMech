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
import Database, { Channel, User } from './database/database.js';

import OsuMemory from './clients/osumemory.js';
import { Sequelize, where } from 'sequelize';
import Axios from 'axios';

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
		args: {
			offline: {
				triggers: ['offline', 'o'],
				hasValue: false
			}
		}
	},
	async (event, args) => {
		/** Main argument is the channel name to connect to */
		const name = args.main?.value;
		if (!name) {
			/** No main argument provided, null */
			IrcClient.message(event.channel, 'Channel name not provided.');
			return;
		}

		/** Request Twitch for channel ID */
		const response = await Twitch.getUsers({ login: name });
		const id = response?.data.data[0]?.id;

		/** Check if id returned is valid */
		if (!id) {
			/** Channel name doesnt exist on Twitch */
			IrcClient.message(event.channel, 'Invalid channel name.');
			return;
		}

		/** Obtain channel model from database, or build it if it doesnt exist on the database */
		const [channel, built] = await Channel.findOrBuild({
			where: { id: id },
			defaults: { name: name.toLowerCase() }
		});
		channel['connected'] = true;
		channel['offline'] = args.offline?.triggered;
		await channel.save();

		/** Join channel in IRC */
		IrcClient.join(name);
		IrcClient.message(name, `/me joined ${name}.`);
	}
);

CommandManager.create(
	{
		triggers: ['part', 'leave'] ,
		rank: Rank.ADMIN
	},
	async (event, args) => {
		/** Main argument is the channel name to disconnect from */
		const name = args.main?.value;
		if (!name) {
			/** No main argument provided, null */
			IrcClient.message(event.channel, 'Channel name not provided.');
			return;
		}

		/** Request Twitch for channel ID */
		const response = await Twitch.getUsers({ login: name });
		const id = response?.data.data[0]?.id;

		/** Check if id returned is valid */
		if (!id) {
			/** Channel name doesnt exist on Twitch */
			IrcClient.message(event.channel, 'Invalid channel name.');
			return;
		}

		/** Obtain channel model from database, or build it if it doesnt exist on the database */
		const [channel, built] = await Channel.findOrBuild({
			where: { id: id },
			defaults: { name: name.toLowerCase() }
		});
		channel['connected'] = false;
		await channel.save();

		/** Join channel in IRC */
		IrcClient.message(name, `/me left ${name}.`);
		IrcClient.part(name);
	}
);

CommandManager.create(
	{
		triggers: ['channels', 'connected'],
		rank: Rank.ADMIN
	},
	async (event, args) => {
		const channels = await Channel.findAll({ where: { connected: true } });
	}
);

CommandManager.create(
	{
		triggers: ['memtoggle', 'mt'],
		rank: Rank.OWNER
	},
	(event, args) => {
		OsuMemory.toggleSearch();
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
				hasValue: true
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

CommandManager.create(
	{
		triggers: ['stoic'],
		cooldown: 10* 1000
	},
	async (event, args) => {
		const request = await Axios.request({
			baseURL: 'https://stoic-quotes.com',
			url: '/api/quote',
			method: 'get'
		});
		IrcClient.message(event.channel, request['data']['text']);
	}
)

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
