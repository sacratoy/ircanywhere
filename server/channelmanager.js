var dependable = Meteor.require('dependable'),
    container = dependable.container(),
    _ = Meteor.require('underscore');

var ChannelManager = function() {
	"use strict";

	var Manager = {
		channel: {
			network: '',
			channel: '',
			topic: {},
			modes: {},
			users: {}
		},
		// a default channel object

		init: function() {

		},

		createChannel: function(network, channel) {
			var chan = _.clone(this.channel);
			// clone this.channel

			chan.network = network;
			chan.channel = channel.toLowerCase();

			chan._id = Channels.insert(chan);
			// insert into the db

			return chan || false;
		},

		getChannel: function(network, channel) {
			return Channels.findOne({network: network, channel: channel});
		},

		insertUsers: function(key, network, channel, users, force) {
			var force = force || false,
				channel = channel.toLowerCase(),
				update = {},
				chan = this.getChannel(network, channel);

			if (!chan) {
				var chan = this.createChannel(network, channel);
				// create the channel

				Meteor.ircFactory.send(key, 'raw', ['WHO', channel]);
				// we also do a /WHO here because we don't have this channel.. We want something
				// a bit more detailed than the default NAMES reply
			}

			_.each(users, function(u) {
				var field = (force) ? u.nickname : 'users.' + u.nickname;
				update[field] = u;
			});
			// create an update record

			if (force) {
				Channels.update({network: network, channel: channel}, {$set: {users: update}});
			} else {
				Channels.update({network: network, channel: channel}, {$set: update});
			}
			// send the update out
		},

		removeUsers: function(network, channel, users) {
			var update = {},
				channel = (_.isArray(channel)) ? channel : channel.toLowerCase(),
				users = (_.isArray(channel)) ? channel : users;
			// basically we check if channel is an array, if it is we're being told to
			// jsut remove the user from the entire network (on quits etc)

			_.each(users, function(u) {
				update['users.' + u] = 1;
			});
			// create an update record

			if (_.isArray(channel)) {
				Channels.update({network: network}, {$unset: update});
			} else {
				Channels.update({network: network, channel: channel}, {$unset: update});
				// update

				if (Channels.findOne({network: network, channel: channel}).users.length == 0) {
					Channels.remove({network: network, channel: channel});
				}
				// check if the user list is empty
			}
			// send the update out
		},

		updateUsers: function(network, users, values) {
			var query = {network: network},
				update = {},
				nickChange = false;

			_.each(values, function(v) {
				if (v == 'nickname') {
					nickChange = true;
				}

				_.each(users, function(u) {
					if (v == 'nickname') {
						update['users.' + u + '.' + v] = values[m];
					} else {
						query['users.' + u] = {$exists: true};
					}
				});
				// create an update record
			});

			_.each(users, function(u) {
				var s = {};
					s['users.' + u] = {$exists: true};
				var q = _.extend(query, s),
					record = Channels.findOne(q),
					user = record.users[u],
					updated = _.extend(user, values);

				if ('nickname' in values) {
					record['users'][values.nickname] = updated;
					delete record['users'][u];
				} else {
					record['users'][record.nickname] = updated;
				}

				Channels.update({network: network, channel: channel}, record);
				// update the channel record
			});
			// this is hacky as hell I feel but it's getting done this way to
			// comply with all the other functions in this class
		}
	};

	Manager.init();

	return Manager;
};

Meteor.channelManager = container.resolve(ChannelManager);