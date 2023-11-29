/*
    znxmech.js : main
    -----------------
*/

// imports
import * as DataType from './data-types.js';
import * as Client from './clients.js';
import * as Manager from './managers.js';
import 'dotenv/config';

/*
    bot:
*/

class Bot {
	static async start() {
		// client inits
		await Client.Twitch.init();

		// mananger inits
		await Manager.Irc.init();
		// await Manager.EventSub.init(); // deprecated
		Manager.Channel.init();

		// bot init
		Bot.initCommends();
		Manager.Irc.join(process.env.BOT_NICK);
		Manager.Channel.joinChannel(process.env.BOT_ID);

		Manager.User.setRank(process.env.OWNER_ID, DataType.Commend.ranks.owner);
		Manager.User.setRank(process.env.BOT_ID, DataType.Commend.ranks.owner);
	}

	/*
        commends definitions
    */

	static initCommends() {
		Manager.Commend.createCommend({ name: 'hey', rank: DataType.Commend.ranks.default }, (event) => {
			Manager.Irc.sendMessage(event.channel, `/me FeelsOkayMan Hey ${event.userName}`);
		});

		Manager.Commend.createCommend({ name: 'info', rank: DataType.Commend.ranks.trusted }, async (event) => {
			// returns a list of irc connected channels
			if (Manager.Commend.getVarBoolean(event, 'channels')) {
				let names = Manager.Channel.getConnectedNames();
				Manager.Irc.sendMessage(event.channel, `/me is currently connected to: ${names.join(', ')}`);
			}
		});

		Manager.Commend.createCommend({ name: 'join', rank: DataType.Commend.ranks.admin }, async (event) => {
			let name = Manager.Commend.getVar(event, 'name');
			let id = Manager.Commend.getVar(event, 'id');

			if (!id && !name) {
				return;
			}

			if (!name) {
				id = await Manager.Channel.getApiName(id);
			}

			if (!id) {
				id = await Manager.Channel.getApiId(name);
			}

			console.log(`joined ${name}`);
			Manager.Irc.join(name);
			Manager.Channel.joinChannel(id, name);
			Manager.Irc.sendMessage(name, '/me has joined peepoArrive');
		});

		Manager.Commend.createCommend({ name: 'part', rank: DataType.Commend.ranks.admin }, async (event) => {
			let name = Manager.Commend.getVar(event, 'name');
			let id = Manager.Commend.getVar(event, 'id');

			if (!id && !name) {
				return;
			}

			if (!name) {
				id = await Manager.Channel.getApiName(id);
			}

			if (!id) {
				id = await Manager.Channel.getApiId(name);
			}

			console.log(`parted ${name}`);
			Manager.Irc.sendMessage(name, '/me has joined peepoLeave');
			Manager.Irc.part(name);
			Manager.Channel.partChannel(id);
		});
	}
}

/*
    bot startup
*/

Bot.start();
