import { Message } from "whatsapp-web.js";
import { startsWithIgnoreCase } from "../utils";

// Config & Constants
import config from "../config";

// CLI
import * as cli from "../cli/ui";

// ChatGPT & DALLE
import { handleMessageGPT, handleDeleteConversation } from "../handlers/gpt";
import { handleMessageDALLE } from "../handlers/dalle";

// For deciding to ignore old messages
import { botReadyTimestamp } from "../index";

const salutationArr = ['hi', 'hello', 'hey'];
const salutationResponse = `Hello there😄!\nThank you for using *GPT Mobile*!\n\nDirectly send messages and prompts to me and I'll get them for you using the same engine as ChatGPT\n\nTo generate images type "image" before the prompt.\n\nEx- "image bugatti chiron"`;

export class StateMachine {

	// Handles message
	async handleIncomingMessage(message: Message) {
		let messageString = message.body;
		const selfNotedMessage = message.fromMe && message.hasQuotedMsg === false && message.from === message.to;
		console.log("#### selfNotedMessage: ", selfNotedMessage);
		const lastIndex = messageString.indexOf(' ') == -1 ? messageString.length : messageString.indexOf(' '); 
		const dallePrefix = messageString.substring(0, lastIndex);

		if(config.dallePrefix.includes(dallePrefix)){
			const prompt = messageString.substring(dallePrefix.length + 1);
			const dalleResponse = await handleMessageDALLE(message, prompt);
			console.log("####Dall-E Resposne: ", dalleResponse);
			return (dalleResponse && dalleResponse.startsWith("https")) ? { type: "image", image: dalleResponse } : { type: "text", bodyText: dalleResponse || "Error while fetching image" };
		}

	
		if (!config.prefixEnabled || (config.prefixSkippedForMe && selfNotedMessage)) {
			console.log("###gpt 2: ", message);
			const gptResponse = await handleMessageGPT(message, messageString);
			console.log("####GPT Resposne: ", gptResponse);
			return { type: "text", bodyText: gptResponse };
		}
	}

	async processInput(inputMessage){
		if(inputMessage.type != 'text') 
			return { type: "unsupported" };

		const processedInput = {
			from: `${inputMessage.from}@c.us`,
			to: `19295664909@c.us`,
			hasQuotedMsg: false,
			fromMe: false,
			body: inputMessage.data.text,
			timestamp: inputMessage.timestamp, 
			hasMedia: false,
			type: "text"
		};	
		return processedInput;
	}

	async getOutput(userMsg) {
		if (userMsg.timestamp != null) {
			const messageTimestamp = new Date(userMsg.timestamp * 1000);
	
			// If startTimestamp is null, the bot is not ready yet
			if (botReadyTimestamp == null) {
				cli.print("Ignoring message because bot is not ready yet:");
				return { type: "text", bodyText: "messageIngored" };
			}
	
			// Ignore messages that are sent before the bot is started
			if (messageTimestamp < botReadyTimestamp) {
				cli.print("Ignoring old messages");
				return { type: "text", bodyText: "messageIgnored" };
			}
			console.log("####messagetimestamp: ", messageTimestamp, " botReadyTimestamp: ", botReadyTimestamp);
		}

		if(userMsg.type != "text") 
			return { type: "text", bodyText: "Bot can only support text input at this time"};

		if(salutationArr.includes(userMsg.body.toLowerCase()))
			return { type: "text", bodyText: salutationResponse };

		const response = await this.handleIncomingMessage(userMsg);
		return response;
	}
}
