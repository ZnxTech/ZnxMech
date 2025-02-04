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
import { formatTimeString } from './managers/triggers.js';

import OsuMemory from './clients/osumemory.js';
import FileSystem from 'fs';
import { Sequelize, where } from 'sequelize';
import Axios from 'axios';

/**
 * preload assets:
 * ---------------
 */

/**
 * @type {String[]} gtnhTips - an array of all menu tips from GTNH.
 */
const gtnhTips = FileSystem.readFileSync('./resources/gtnhtips.txt').toString().split('\n');

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
		triggers: ['part', 'leave'],
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
		triggers: ['rank', 'r'],
		rank: Rank.OWNER,
		args: {
			name: {
				triggers: ['name', 'n'],
				hasValue: true
			},
			id: {
				triggers: ['id', 'i'],
				hasValue: true
			}
		}
	},
	async (event, args) => {
		let rank = 0;

		if (args.main.triggered) {
			switch (args.main.value) {
				case 'banned':
				case '-1':
					rank = -1;
					break;

				case 'default':
				case '0':
					rank = 0;
					break;

				case 'trusted':
				case '1':
					rank = 1;
					break;

				case 'admin':
				case '2':
					rank = 2;
					break;

				default:
					return;
			}
		}

		if (args.name?.triggered) {
			const userApi = await Twitch.getUsers({ login: args.name?.value ?? '' });
			const userId = userApi?.data.data[0]?.id;
			if (!userId) {
				return;
			}

			const [user, built] = await User.findOrBuild({
				where: { name: args.name?.value },
				defaults: { id: userId }
			});

			if (user['rank'] >= Rank.ADMIN) return; // User is admin/owner, dont change.
			if (user['rank'] != Rank.OWNER && rank >= Rank.ADMIN) return; // User isnt owner, dont change.

			user['rank'] = rank;
			await user.save();
		} else if (args.id?.triggered) {
			const userApi = await Twitch.getUsers({ if: args.id?.value ?? '0' });
			const userName = userApi?.data.data[0]?.login;
			if (!userName) {
				return;
			}

			const [user, built] = await User.findOrBuild({
				where: { id: args.id?.value },
				defaults: { name: userName }
			});

			if (user['rank'] >= Rank.ADMIN) return; // User is admin/owner, dont change.
			if (user['rank'] != Rank.OWNER && rank >= Rank.ADMIN) return; // User isnt owner, dont change.

			user['rank'] = rank;
			await user.save();
		}
	}
);

CommandManager.create(
	{
		triggers: ['changecd', 'ccd'],
		rank: Rank.ADMIN,
		args: {
			time: {
				triggers: ['time', 't'],
				hasValue: true
			},
			remove: {
				triggers: ['remove', 'r'],
				hasValue: false
			}
		}
	},
	(event, args) => {
		if (!args.main.triggered) return;
		const command = CommandManager.getCommand(args.main.value ?? '');

		if (!command) return;
		if (args.remove?.triggered) {
			command.cooldown = 0;
			return;
		}

		if (args.time?.triggered) {
			const cooldown = Number(args.time?.value);
			if (isNaN(cooldown)) return;
			command.cooldown = cooldown;
		}
	}
);

CommandManager.create(
	{
		triggers: ['channels', 'connected'],
		rank: Rank.ADMIN
	},
	async (event, args) => {
		const channels = await Channel.findAll({ where: { connected: true } });
		let channelsStr = '';
		for (const channel of channels) {
			channelsStr += `${channel['name']}, `;
		}
		IrcClient.message(event.channel, `/me is connected to: ${channelsStr.slice(0, -2)}.`);
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

CommandManager.create(
	{
		triggers: ['kill'],
		rank: Rank.ADMIN
	},
	(event, args) => {
		process.exit();
	}
);

CommandManager.create(
	{
		triggers: ['fish', 'f'],
		cooldown: 20 * 60 * 1000,
		gamewhitelist: ['LurkBait Twitch Fishing'],
		rank: Rank.DEFAULT
	},
	(event, args) => {
		let userCName = args.main.triggered ? args.main.value : event.userCName;
		if (userCName?.[0] == '@') {
			userCName = userCName.slice(1);
		}
		IrcClient.message(event.channel, `!fish @${userCName}`);
	},
	(event, args) => {
		const command = CommandManager.getCommand('fish');
		const remainder = command?.getCooldownRemainder(event.roomId, event.userId) ?? 0;
		IrcClient.message(
			event.channel,
			`@${event.userCName} Your next $fish is in ${formatTimeString(remainder)}. Fishge`
		);
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
		blacklist: ['btmc'],
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

CommandManager.create(
	{
		triggers: ['stoic'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	async (event, args) => {
		const request = await Axios.request({
			baseURL: 'https://stoic-quotes.com',
			url: '/api/quote',
			method: 'get'
		});
		IrcClient.message(event.channel, request['data']['text']);
	}
);

CommandManager.create(
	{
		triggers: ['dtar'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	(event, args) => {
		let AR;
		if (args.main.triggered) {
			AR = Number(args.main.value);
		} else {
			return;
		}

		if (typeof AR == 'number' && !isNaN(AR)) {
			// calc visible object time
			let preempt;
			if (AR < 5) {
				preempt = 1200 + (600 * (5 - AR)) / 5;
			} else {
				preempt = 1200 - (750 * (AR - 5)) / 5;
			}

			// apply doubletime speed
			preempt /= 1.5;

			// reverse calc to approach rate
			let DTAR;
			if (preempt > 1200) {
				DTAR = 5 - (5 * (preempt - 1200)) / 600;
			} else {
				DTAR = 5 - (5 * (preempt - 1200)) / 750;
			}

			IrcClient.message(event.channel, `AR ${AR} with DT is AR ${DTAR.toFixed(3)}`);
		} else {
			IrcClient.message(event.channel, `not a valid AR number.`);
		}
	}
);

CommandManager.create(
	{
		triggers: ['tip', 'gtnhtip', 'gregtip'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	async (event, args) => {
		// fetch a random tip from array.
		const tipNumber = Math.floor(Math.random() * gtnhTips.length);
		const tipString = gtnhTips[tipNumber];

		IrcClient.message(event.channel, `${tipString}`);
	}
);

// /**
//  * Text commands:
//  */

// Mainly for testing
CommandManager.create(
	{
		triggers: ['hey', 'hello', 'hi'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	(event, args) => {
		IrcClient.message(event.channel, `FeelsOkayMan Hey ${event.userCName}`);
	}
);

// Help command
CommandManager.create(
	{
		triggers: ['help', 'h'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	(event, args) => {
		IrcClient.message(event.channel, 'Idk read this https://github.com/ZnxTech/ZnxMech/blob/main/index.js');
	}
);

// For tonker manana :3c
CommandManager.create(
	{
		triggers: ['tasty'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	(event, args) => {
		IrcClient.message(event.channel, `Tasty`);
	}
);

// Fuck this emote fr.
CommandManager.create(
	{
		triggers: ['fuckta'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	(event, args) => {
		IrcClient.message(event.channel, `ta filter: !(message.content match r"\\b(ta|tuh)\\b")`);
	}
);

// Source link
CommandManager.create(
	{
		triggers: ['source', 'sourcecode', 'repo', 'git'],
		cooldown: 30 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, 'The ZnxMech repo: https://github.com/ZnxTech/ZnxMech');
	}
);

CommandManager.create(
	{
		triggers: ['fork', 'forkbomb'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	(event, args) => {
		IrcClient.message(event.channel, ':tf: :(){ :|:& }; :');
	}
);

CommandManager.create(
	{
		triggers: ['config', 'configs', 'dotfiles'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	(event, args) => {
		IrcClient.message(event.channel, 'My linux config files: https://github.com/ZnxTech/.config');
	}
);

CommandManager.create(
	{
		triggers: ['prism', 'prismlauncher', 'getprism'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
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
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	(event, args) => {
		IrcClient.message(event.channel, 'Angelica (Forge 1.7.10 Sodium): https://github.com/GTNewHorizons/Angelica');
	}
);

CommandManager.create(
	{
		triggers: ['key', 'apikey', 'curseforgekey'],
		cooldown: 10 * 1000,
		blacklist: ['btmc']
	},
	async (event, args) => {
		IrcClient.message(
			event.channel,
			`CurseForge API key: $2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm`
		);
	}
);
