const express = require("express");
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const app = express();
const PORT = process.env.PORT || 10000;

// Render用HTTPサーバー
app.get("/", (req, res) => {
    res.status(200).send("Discord Bot is running!");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        discord: client?.isReady() ? "connected" : "connecting"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

// Discord Bot
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
    console.error("DISCORD_TOKEN is not set");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("CLIENT_ID is not set");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// コマンド
const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Botの応答速度を表示します"),

    new SlashCommandBuilder()
        .setName("dice")
        .setDescription("ダイスを振ります")
        .addStringOption(option =>
            option
                .setName("dice")
                .setDescription("例: 1d100、2d6、3d20")
                .setRequired(true)
        )
].map(command => command.toJSON());

// コマンド登録
async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    console.log("Registering slash commands...");

    await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        {
            body: commands
        }
    );

    console.log("Slash commands registered.");
}

// Bot起動
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// コマンド処理
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    // /ping
    if (interaction.commandName === "ping") {
        const latency =
            Date.now() - interaction.createdTimestamp;

        await interaction.reply(
            `Pong!\n` +
            `応答速度: ${latency}ms\n` +
            `WebSocket: ${client.ws.ping}ms`
        );

        return;
    }

    // /dice
    if (interaction.commandName === "dice") {
        const input =
            interaction.options.getString("dice");

        const match =
            input.match(/^(\d+)?d(\d+)$/i);

        if (!match) {
            await interaction.reply(
                "形式が正しくありません。\n" +
                "例: `/dice 1d100`"
            );

            return;
        }

        const count = Number(match[1] || 1);
        const sides = Number(match[2]);

        if (count < 1 || count > 100) {
            await interaction.reply(
                "ダイスの個数は1～100までです。"
            );

            return;
        }

        if (sides < 2 || sides > 1000000) {
            await interaction.reply(
                "ダイスの面数は2～1,000,000までです。"
            );

            return;
        }

        const results = [];

        for (let i = 0; i < count; i++) {
            results.push(
                Math.floor(Math.random() * sides) + 1
            );
        }

        const total = results.reduce(
            (sum, value) => sum + value,
            0
        );

        await interaction.reply(
            `🎲 **${count}d${sides}**\n` +
            `出目: ${results.join(", ")}\n` +
            `合計: **${total}**`
        );
    }
});

// 起動
async function start() {
    try {
        await registerCommands();
        await client.login(TOKEN);

        console.log("Discord Bot started successfully.");
    } catch (error) {
        console.error("Failed to start Discord Bot:");
        console.error(error);
    }
}

start();

// プロセスが終了しないことを確認
process.on("SIGTERM", () => {
    console.log("SIGTERM received.");
    client.destroy();
});

process.on("SIGINT", () => {
    console.log("SIGINT received.");
    client.destroy();
});
