const {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
} = require("discord.js");
const base58 = require("bs58");
require("dotenv").config();
const { dataLayout, SOL_MINT } = require("./utils/constants");

const token = process.env["BOT_KEY"];
const helius_api_key = process.env["HELIUS_API_KEY"];

const url = "https://raven-r4cb6g-fast-mainnet.helius-rpc.com/";
const metadata_query_url = `https://api.helius.xyz/v0/token-metadata?api-key=${helius_api_key}`;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("error", (log) => console.log(log));

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.channelId === "1190605228563767376" && message.embeds) {
    console.log(message.embeds[0]?.data?.fields[3]?.value?.substring(27));
    const tx = message.embeds[0]?.data?.fields[3]?.value?.substring(27);
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          tx,
          {
            encoding: "json",
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        //console.log(json.result.meta.postTokenBalances);

        const ammId = json.result.transaction.message.accountKeys[2];

        const tokenMint = json.result.transaction.message.accountKeys[17];
        const quoteMint = json.result.transaction.message.accountKeys[14];
        if (tokenMint == undefined || quoteMint != SOL_MINT) {
          return;
        }

        const serumId = json.result.transaction.message.accountKeys[19];

        console.log(
          `AMM_ID: ${ammId} | TOKEN_MINT: ${tokenMint} | QUOTE_MINT: ${quoteMint}`
        );
        console.log(`Serum_ID: ${serumId}`);

        const data = dataLayout.decode(
          base58.decode(
            json.result?.transaction?.message?.instructions[4]?.data
          )
        );
        let launchTime = new Date(Number(data.openTime) * 1000).toUTCString();
        if (launchTime.includes("Invalid Date")) {
          launchTime = "N/A";
        }
        console.log(`Launch Time: ${launchTime}`);

        let coinAmount;
        if (json.result.meta.postTokenBalances[0].mint == tokenMint) {
          coinAmount =
            json.result.meta.postTokenBalances[0].uiTokenAmount.uiAmountString;
        } else {
          coinAmount =
            json.result.meta.postTokenBalances[1].uiTokenAmount.uiAmountString;
        }
        let pcAmount;
        if (json.result.meta.postTokenBalances[1].mint == SOL_MINT) {
          pcAmount =
            json.result.meta.postTokenBalances[1].uiTokenAmount.uiAmountString;
        } else {
          pcAmount =
            json.result.meta.postTokenBalances[0].uiTokenAmount.uiAmountString;
        }
        if (pcAmount == undefined) {
          pcAmount = "N/A";
        }
        console.log(`Coin Amount: ${coinAmount} | PC Amount: ${pcAmount}`);

        fetch(metadata_query_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mintAccounts: [tokenMint],
            includeOffChain: true,
          }),
        })
          .then((res) => res.json())
          .then((json) => {
            let name = json[0]?.onChainMetadata?.metadata?.data?.name;
            if (name == undefined) {
              name = "N/A";
            }
            let symbol = json[0]?.onChainMetadata?.metadata?.data?.symbol;
            if (symbol == undefined) {
              symbol = "N/A";
            }

            const uri = json[0]?.offChainMetadata?.uri;
            console.log(`Name: ${name} | Symbol: ${symbol}`);

            fetch(uri)
              .then((res) => res.json())
              .then((json) => {
                let description = json.description;
                if (description == undefined || description == "") {
                  description = "N/A";
                }
                let img_uri = json.image;
                if (img_uri.startsWith("data:image")) {
                  img_uri = "attachment:" + img_uri;
                }
                if (
                  !img_uri.startsWith("http") &&
                  !img_uri.startsWith("data:image")
                ) {
                  img_uri =
                    "https://icons.veryicon.com/png/o/education-technology/alibaba-cloud-iot-business-department/image-load-failed.png";
                }

                console.log(`Description: ${description} | Image: ${img_uri}`);

                const embed = new EmbedBuilder()
                  .setColor(0x4f30ff)
                  .setAuthor({ name: "LaunchBot" })
                  .setTitle("Launch Alert")
                  .setURL(`https://solscan.io/account/${ammId}`)
                  .setDescription(`Launch Alert for ${name}`)
                  .setThumbnail(img_uri)
                  .addFields(
                    { name: "Token Name:", value: name, inline: true },
                    { name: "Symbol: ", value: symbol, inline: true },
                    {
                      name: "Launch Time: ",
                      value: launchTime,
                      inline: true,
                    },
                    {
                      name: "Description: ",
                      value: description,
                      inline: false,
                    },
                    {
                      name: "Pooled SOL: ",
                      value: pcAmount,
                      inline: false,
                    },
                    {
                      name: "Contract Address: ",
                      value: `[${tokenMint}](https://dexscreener.com/solana/${tokenMint} "DexScreener")`,
                      inline: false,
                    }
                  )
                  .setImage(img_uri)
                  .setTimestamp();

                const targetChannel = client.channels.cache.get(
                  "1192767457300054067"
                );
                targetChannel.send({ embeds: [embed] });
              });
          });
      });
  }
});

// Log in to Discord with your client's token
client.login(token);
