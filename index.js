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
		triggers: ['sourcecode', 'source', 'repo', 'git'],
		cooldown: 10 * 1000
	},
	(event, args) => {
		IrcClient.message(event.channel, 'https://github.com/ZnxTech/ZnxMech');
	}
);

CommandManager.create(
	{
		triggers: ['join'],
		rank: Rank.ADMIN,
		cooldown: 0,
		args: {
			isOfflineOnly: {
				triggers: ['offline', 'o'],
				type: ArgValue.NULL
			}
		}
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
				/** Set connection status to true */
				user['isConnected'] = true;
				/** Set offline only status */
				user['isOfflineOnly'] = args.isOfflineOnly?.triggered;
				/** Save channel model to database */
				await user.save();
				/** Join channel in IRC */
				IrcClient.join(name);
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
