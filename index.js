const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
    console.error("DISCORD_TOKEN が設定されていません");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("CLIENT_ID が設定されていません");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

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

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registerCommands() {
    try {
        console.log("スラッシュコマンドを登録中...");

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            {
                body: commands
            }
        );

        console.log("スラッシュコマンドの登録完了");
    } catch (error) {
        console.error(error);
    }
}

client.once("ready", () => {
    console.log(`ログインしました: ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
        const latency = Date.now() - interaction.createdTimestamp;

        await interaction.reply(
            `Pong!\n応答速度: ${latency}ms\nWebSocket: ${client.ws.ping}ms`
        );
    }

    if (interaction.commandName === "dice") {
        const input = interaction.options.getString("dice");

        const match = input.match(/^(\d+)?d(\d+)$/i);

        if (!match) {
            await interaction.reply(
                "形式が正しくありません。\n例: `/dice 1d100`"
            );
            return;
        }

        const count = Number(match[1] || 1);
        const sides = Number(match[2]);

        if (count < 1 || count > 100) {
            await interaction.reply(
                "ダイスの個数は1～100個までです。"
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

async function main() {
    await registerCommands();
    await client.login(TOKEN);
}

main();
