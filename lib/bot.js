const token = "YOUR_TOKEN_HERE";
const logChannel = "YOUR_LOG_CHANNEL_ID_HERE";

const Discord = require("discord.js");

const authTable = {
    "A_GOD": 3 // Oblivion
};

const allIntents = new Discord.Intents(32767);
const bot = new Discord.Client({ intents: allIntents });

async function sendMessage(channelID, message) {
    const channel = await bot.channels.fetch(channelID);
    channel.send(message);
}

bot.on("ready", function() {
    console.log("Discord bot enabled");
    //sendMessage(logChannel, "Discord bot not enabled");
});

const dns = require("dns");
dns.lookup("google.com", e => {
    if (e && e.code == "ENOTFOUND") {
        console.log("Couldn't establish connection to the internet!");
    } else {
        console.log("Logging bot in!");
        bot.login(token);
    }
});

const commands = {};

bot.on("messageCreate", message => {
    if (message.author.bot || !message.content.startsWith("&")) {
        return;
    }
    let args = message.content.slice(1).split(" ");
    let command = args.shift();
    if (commands[command]) {
        commands[command](message, args, bot);
    }
});

module.exports = {
    bot: bot,
    get commands() {
        return Object.keys(commands);
    },
    addCommand: function(command, callback) {
        commands[command] = callback;
    },
    createEmbed: function(options = {}) {
        return embed = new Discord.MessageEmbed()
            .setAuthor({ name: "floomy.io", iconURL: "https://cdn.discordapp.com/avatars/999039281379160224/6707ec35608d6b44e73f03fde34a0ff2.png", url: "https://floomy.woomy-arras.xyz/" })
            .setColor(0x8abc3f)
            .setDescription(options.title || "")
            .addFields(options.fields || [])
            .setTimestamp();
    },
    checkPermissions: function(message) {
        return authTable[message.author.id] || 0;
    },
    unauth: function(message) {
        message.channel.send({
            embeds: [module.exports.createEmbed({
                title: "You are unauthorized to perform this command"
            })]
        });
    }
}