// @ts-check

/**
 * Connects to the database.
 * @module Database
 * @author Daniel "Znx" Levi
 */

/** Imports: */
import { Sequelize, DataTypes, Model } from 'sequelize';

/**
 * The Sequelize instance.
 * Change database connection here.
 * @type {Sequelize}
 * @default
 */
const Database = new Sequelize({
	dialect: 'sqlite',
	storage: './database/data.db',
	logging: false
});

/**
 *
 */
export class User extends Model {}
/** Users table def */
User.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			unique: true,
			allowNull: false
		},
		name: {
			type: DataTypes.STRING(25),
			unique: true,
			allowNull: false
		},
		rank: {
			type: DataTypes.SMALLINT,
			defaultValue: 0,
			allowNull: false
		},
		points: {
			type: DataTypes.BIGINT,
			defaultValue: 0,
			allowNull: false
		}
	},
	{
		sequelize: Database,
		modelName: 'User',
		timestamps: false
	}
);

/**
 *
 */
export class Channel extends Model {}
/** Channels table def */
Channel.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			unique: true,
			allowNull: false
		},
		name: {
			type: DataTypes.STRING(25),
			unique: true,
			allowNull: false
		},
		connected: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		offline: {
			type: DataTypes.BOOLEAN,
			defaultValue: true,
			allowNull: false
		}
	},
	{
		sequelize: Database,
		modelName: 'Channel',
		timestamps: false
	}
);

/** Sync with database on import */
await Database.sync();

/** Export default */
export default Database;
