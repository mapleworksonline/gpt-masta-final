import { createBot } from "whatsapp-cloud-api";

import { StateMachine } from "./handlers/message";

// Config
import { initAiConfig } from "./handlers/ai-config";
import { initOpenAI } from "./providers/openai";
import { responseTemplate } from "./templates";
import { config } from "./config";

// Ready timestamp of the bot
let botReadyTimestamp: Date | null = null;

// Entrypoint
const start = async () => {

    try {
        const stateMachine = new StateMachine();
		const from = config.whatsappId;
		const token = config.whatsappBotToken;
        const webhookVerifyToken = config.whatsappWebhookToken;
        
        // Create a bot that can send messages
        const bot = createBot(from, token);

        await bot.startExpressServer({
            port: 3000,
            webhookVerifyToken,
        });

		botReadyTimestamp = new Date();
        console.log("####BotReadyTimeStamp: ", botReadyTimestamp);
		initAiConfig();
		initOpenAI();
        // Listen to ALL incoming messages
        // NOTE: remember to always run: await bot.startExpressServer  first
        bot.on('message', async (msg) => {
            console.log("####Inputmsg: ", msg);
            const inputMsg = await stateMachine.processInput(msg);
            const response : responseTemplate = await stateMachine.getOutput(inputMsg) || { type: "text", bodyText: "Error in Message handling, Please Try Again" };
            console.log("####response: ", response);
			try {
				if (response.hasOwnProperty("template")) {
						const templateLogs = await bot.sendText(msg.from, response.bodyText || "Hello!");
						console.log("####TemplateLogs: ", templateLogs);
				} else {
					if (response.type == "image") {
						await bot.sendImage(msg.from, response.image || "werwwd" );
					} else if(response.bodyText != "messageIgnored") {
						await bot.sendText(msg.from, response.bodyText || "Error fetching response");
					}
				}
			} catch (err) {
				console.log("####sendMessage Error: ", err);
			}
        });

    } catch (err) {
        console.log("Server setup Failed, Error: ", err );
    }
};

start();

export { botReadyTimestamp };
