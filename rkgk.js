const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require('fs');
const jsonFormat = require('json-format');

const config = JSON.parse(String(fs.readFileSync(__dirname + '/config.json')));

var guildData = {};
try {
    guildData = JSON.parse(String(fs.readFileSync(__dirname + '/guild-data.json')));
} catch (e) {
    fs.writeFile(__dirname + '/guild-data.json', jsonFormat(guildData), function (err) { if (err) { console.error(err); } });
}

const letters = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿'];

var cron = require('node-cron');

var cacheRoleReactMessages = function () {
    for (var guildId in guildData) {
        var guild = client.guilds.resolve(guildId);
//	console.log(guild.name);
        guild.channels.resolve(guildData[guild.id].announcementsChannel).fetch().then(function (announcementsChannel) {
//	    console.log(announcementsChannel.name);
	    announcementsChannel.messages.fetch(guildData[guild.id].roleReactMessage).then(function (roleReactMessage) {
//		console.log(roleReactMessage.content);
	    });
        });
    }
}

var updateGuildData = function () {
    fs.writeFile(__dirname + '/guild-data.json', jsonFormat(guildData), function (err) { if (err) { console.error(err); } });
};

var getMentions = function (command) {
    var split = command.split(/(<#|<@!|<@&|>)/g);
    var mentions = {
	users: [],
	roles: [],
	channels: []
    };
    var i = 0;
    for (var i = 0; i < split.length - 3; i++) {
	if (split[i + 2] === '>' && /[0-9]+/.test(split[i + 1])) {
	    if (split[i] === '<@!') {
		mentions.users.push(split[i + 1]);
		i += 2;
	    } else if (split[i] === '<@&') {
		mentions.roles.push(split[i + 1]);
		i += 2;
	    } else if (split[i] === '<#') {
		mentions.channels.push(split[i + 1]);
		i += 2;
	    }
	}
    }
    return mentions;
};

var init = async function (guild) {
    // basic setup of the tournament server
    // todo clear all existing stuff in the server
    await guild.setDefaultMessageNotifications('MENTIONS');
    var existingRoles = guild.roles.cache.array(); // does this really load all the roles? cache business confuses me D:
    for (var role of existingRoles) {
	try {
	    await role.delete();
	} catch (e) {
	    console.error('could not delete role: ' + role.name);
	    // console.error(e);
	}
    } // empty out existing roles so the correct ones can take their place
    existingChannels = guild.channels.cache.array(); // shrug
    for (var channel of existingChannels) {
	await channel.delete();
    }
    var controlRoomRole = await guild.roles.create({
	data: {
	    name: 'Control Room',
	    color: 'PURPLE',
	    hoist: true,
	    permissions: 'ADMINISTRATOR',
	    mentionable: true,
	    position: 1
	}
    });
    var staffRole = await guild.roles.create({
	data: {
	    name: 'Staff',
	    color: 'BLUE',
	    hoist: true,
	    mentionable: true,
	    position: 1
	}
    });
    var spectatorRole = await guild.roles.create({
	data: {
	    name: 'Spectator',
	    color: 'AQUA',
	    hoist: true,
	    mentionable: true,
	    position: 1
	}
    });
    var playerCoachRole = await guild.roles.create({
	data: {
	    name: 'Player/Coach',
	    color: 'RED',
	    hoist: true,
	    mentionable: true,
	    position: 1
	}
    });
    var controlRoomCategory = await guild.channels.create('Control Room', {type: 'category'});
    await controlRoomCategory.updateOverwrite(guild.roles.everyone, {
	'VIEW_CHANNEL': false
    });
    await controlRoomCategory.updateOverwrite(staffRole, {
	'VIEW_CHANNEL': true
    });
    var linksChannel = await guild.channels.create('announcements-and-links', {parent: controlRoomCategory});
    await linksChannel.updateOverwrite(staffRole, {
	'SEND_MESSAGES': false
    });
    /*
      var packetsChannel = await guild.channels.create('packets', {parent: controlRoomCategory});
      await packetsScoresheetsChannel.updateOverwrite(staffRole, {
      'SEND_MESSAGES': false
      });
    */
    var protestsChannel = await guild.channels.create('protests', {parent: controlRoomCategory})
    var botCommandsChannel = await guild.channels.create('bot-commands', {parent: controlRoomCategory});;
    var controlRoomChannel = await guild.channels.create('control-room', {parent: controlRoomCategory});
    var controlRoomVoiceChannel = await guild.channels.create('control-room-voice', {parent: controlRoomCategory, type: 'voice'});
    var hubCategory = await guild.channels.create('Hub', {type: 'category'});
    /*
    await hubCategory.updateOverwrite(guild.roles.everyone, {
	'VIEW_CHANNEL': false
    });
    await hubCategory.updateOverwrite(staffRole, {
	'VIEW_CHANNEL': true
    });
    await hubCategory.updateOverwrite(spectatorRole, {
	'VIEW_CHANNEL': true
    });
    await hubCategory.updateOverwrite(playerCoachRole, {
	'VIEW_CHANNEL': true
    });
    */
    // control room has implicit permissions
    var announcementsChannel = await guild.channels.create('announcements', {parent: hubCategory});
    await announcementsChannel.updateOverwrite(guild.roles.everyone, {
	'SEND_MESSAGES': false
    });
    await announcementsChannel.send(guild.name + ' is committed to ensuring that quizbowl is safe, open, and welcoming for everyone. If anyone at this tournament makes you feel unsafe or unwelcome, please do not hesitate to reach out to anyone with the ' + controlRoomRole.toString() + ' or ' + staffRole.toString() + ' roles. In addition, please feel free to make use of the quizbowl misconduct form, a joint effort by PACE, NAQT, ACF, and IAC [https://tinyurl.com/qbmisconduct].'); 
    var roleReactMessage = await announcementsChannel.send('room react message TODO come up with nice sounding words');
    var joinLogChannel = await guild.channels.create('join-log', {parent: hubCategory});
    await announcementsChannel.updateOverwrite(guild.roles.everyone, {
        'SEND_MESSAGES': false
    });
    var generalChannel = await guild.channels.create('general', {parent: hubCategory});
    // var botCommandsChannel = await guild.channels.create('bot-commands', {parent: hubCategory});
    var hallwayVoiceChannel = await guild.channels.create('hallway-voice', {parent: hubCategory, type: 'voice'});
    // todo set hub permissions
    var honorPledgeCategory = await guild.channels.create('Honor Pledge', {type: 'category'});
    await honorPledgeCategory.updateOverwrite(staffRole, {
	'SEND_MESSAGES': false
    });
    await honorPledgeCategory.updateOverwrite(spectatorRole, {
	'SEND_MESSAGES': false
    });
    await honorPledgeCategory.updateOverwrite(playerCoachRole, {
	'SEND_MESSAGES': false
    });
    var honorPledgeChannel = guild.channels.create('honor-pledge', {parent: honorPledgeCategory});
    await guild.owner.roles.add(controlRoomRole);
    await guild.setDefaultMessageNotifications('MENTIONS');
    await guild.setSystemChannel(generalChannel);
    guildData[guild.id] = {
	'announcementsChannel': announcementsChannel.id,
	'roleReactMessage': roleReactMessage.id,
	'joinLogChannel': joinLogChannel.id,
	'roles': {
	    'Control Room': controlRoomRole.id,
	    'Staff': staffRole.id,
	    'Spectator': spectatorRole.id,
	    'Player/Coach': playerCoachRole.id
	},
	'rooms': []
    };
    updateGuildData();
}

var createRoom = async function (guild, name, staffSpectatorInvisible) {
    var category = await guild.channels.create(name, {type: 'category'});
    await category.updateOverwrite(guild.roles.everyone, {
	'VIEW_CHANNEL': false
    });
    var staffRole = await guild.roles.fetch(guildData[guild.id].roles['Staff']);
    var	spectatorRole = await guild.roles.fetch(guildData[guild.id].roles['Spectator']);
    var playerCoachRole = await guild.roles.fetch(guildData[guild.id].roles['Player/Coach']);
    var roomRole = await guild.roles.create({
	data: {
	    name: name,
	    mentionable: true,
	    position: 2
	}
    });
    await category.updateOverwrite(roomRole, {
        'VIEW_CHANNEL': true,
	'READ_MESSAGE_HISTORY': false
    });
    if (!staffSpectatorInvisible) {
	await category.updateOverwrite(staffRole, {
	    'VIEW_CHANNEL': true
	});
	await category.updateOverwrite(spectatorRole, {
	    'VIEW_CHANNEL': true
	});
    }
    var cleanName = name.replace(/\s+/g, '-').toLowerCase();
    var text = await guild.channels.create(cleanName + '-text', {parent: category});
    var voice = await guild.channels.create(cleanName + '-voice', {parent: category, type: 'voice'});
    guildData[guild.id].rooms.push({
	'name': name,
	'categoryId': category.id,
	'textId': text.id,
	'roleId': roomRole.id
    });
    updateGuildData();
    playerCoachRole.setPosition(1);
    updateRoleReactMessage(guild);
    return text;
}

var deleteRoom = async function (guild, text) {
    var i = 0;
    for (var room of guildData[guild.id].rooms) {
	if (room.categoryId === text.parent.id) {
	    var parent = text.parent;
	    var name = parent.name
	    for (var channel of parent.children.array()) {
		channel.delete();
	    }
	    parent.delete();
	    guildData[guild.id].rooms.splice(i, 1);
	    updateGuildData();
	    updateRoleReactMessage(guild);
	    return parent.name;
	}
	i++;
    }
}

var updateRoleReactMessage = async function (guild) {
    var announcementsChannel = await guild.channels.resolve(guildData[guild.id].announcementsChannel).fetch();
    var roleReactMessage = await announcementsChannel.messages.fetch(guildData[guild.id].roleReactMessage);
    await roleReactMessage.reactions.removeAll();
    var newMessageText = 'room react message TODO come up with nice sounding words';
    if (guildData[guild.id].rooms.length) {
	newMessageText += '\n';
	var i = 0;
	for (var room of guildData[guild.id].rooms) {
	    newMessageText += letters[i] + ' <#' + room.textId + '>\n';
	    roleReactMessage.react(letters[i]);
	    i++;
	}
    }
    roleReactMessage.edit(newMessageText);
    return;
}

var confirm = function (force, message, prompt, successCb, failCb) {
    if (force) {
	message.react('👍');
	successCb();
	return;
    }

    message.channel.send(prompt).then(function (msg) {
        msg.react('👍');
        msg.awaitReactions(function (reaction, user) {
	    return reaction.emoji.name === '👍' && user.id === message.author.id;
        }, {time: config.confirmWaitTime}).then(function (collected) {
	    if (collected.size === 0) {
                failCb();
	    } else {
                successCb();
	    }
        }).catch(console.error);
    });
};

// too tired to do this rn but basically extend init to create a transfer log and have players join/leave room roles

var processCommand = function (command, message, force) {
    if (!message.guild) { return; }
    if (command.indexOf(config.prefix + 'i') === 0 && message.member === message.member.guild.owner) {
	confirm(force, message, 'Are you sure you want to initialize the server? Every channel and role currently in the server will be deleted. Confirm by reacting with \:thumbsup:.', function () { init(message.guild); }, function () { message.channel.send('lib ball'); });
    } else if (command.indexOf(config.prefix + 'c') === 0 /* && hasRole(message.member, ['Control Room', 'Staff']) */) {
	var content = command.substr(command.indexOf(' ') + 1).trim();
	var names = content.split(/["“”]/g);
	if (names.length < 2) {
	    help(message.channel, ['c']);
	    return;
	}
	confirm(force, message, 'Are you sure you want to create the room[s] ' + content + '? Confirm by reacting with \:thumbsup:.', function () {
	    for (var i = 1; i < names.length; i += 2) {
		var name = names[i];
		createRoom(message.channel.guild, name).then(function (textChannel) {
		    // message.channel.send('Room "' + name + '" has been created.');
		    message.channel.send('Room "' + textChannel.parent.name + '" has been created.');
		}).catch(function (error) {
		    console.error(error);
		    message.channel.send('Room "' + name + '" could not be created. Please try using a different name.');
		    // help(message.channel, ['c']);
		});
	    }
	}, function () {
            message.channel.send('No confirmation was received. The creation is cancelled.');
        });
    } else if (command.indexOf(config.prefix + 'd') === 0) {
	var channels = getMentions(command).channels;
	var prompt = 'Are you sure you want to delete the room[s]';
	for (var channel of channels) {
	    prompt += ' <#' + channel + '>';
	}
	prompt += '? Confirm by reacting with \:thumbsup:.';
	confirm(force, message, prompt, function () {
	    for (var channel of channels) {
		var toDelete = message.channel.guild.channels.resolve(channel);
		deleteRoom(message.channel.guild, toDelete).then(function (name) {
		    message.channel.send('Room "' + name + '" was deleted.');
		}).catch(function (error) {
		    console.error(error);
                    message.channel.send(toDelete.toString() + ' could not be deleted. Please try using a different name.');
		});
	    }
	}, function () {
	    message.channel.send('No confirmation was received. The deletion is cancelled.');
	});
    }
};

client.on('message', function (message) {
    var force = false;
    if (message.content.indexOf('--force') > -1) {
	force = true;
	message.content.replace(/\-\-force/g, '');
    }
    var commands = message.content.split('\n');
    for (var command of commands) {
	processCommand(command, message, force);
    }
});

client.on('messageReactionAdd', function (reaction, user) {
    try {
	if (!reaction.message.channel.guild) {
	    return;
	}
	var guild = reaction.message.channel.guild;
	if (guildData[guild.id] && guildData[guild.id].announcementsChannel === reaction.message.channel.id && guildData[guild.id].roleReactMessage === reaction.message.id) {
	    var roomIndex = letters.indexOf(reaction.emoji.toString());
	    guild.members.fetch(user).then(function (member) {
		member.roles.set([
		    guildData[guild.id].roles['Player/Coach'],
		    guildData[guild.id].rooms[roomIndex].roleId
		]).then(function () {
		    var guildJoinLogChannel = guild.resolve(guildData[guild.id].joinLogChannel);
		    guildJoinLogChannel.send('<@!' + user.id + '> joined room <#' + guildData[guild.id].rooms[roomIndex].textId + '>');
		}).catch(console.error);
	    }).catch(console.error);
	}
    } catch (e) {}
});

client.on('ready', function () {
    console.log('up as ' + client.user.tag);
    client.user.setActivity(config.prefix + 'help', {type: 'LISTENING'});
    for (var guild of client.guilds.cache.array()) {
//	console.log(guild.name + ' ' + guild.owner.user.tag);
    }
    cacheRoleReactMessages();
    cron.schedule('* * * * *', cacheRoleReactMessages);
    return;
});

client.login(config.token);
