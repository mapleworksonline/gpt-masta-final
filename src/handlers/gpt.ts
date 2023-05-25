import os from "os";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Message, MessageMedia } from "whatsapp-web.js";
import { chatgpt } from "../providers/openai";
import * as cli from "../cli/ui";
import config from "../config";

// Moderation
import { moderateIncomingPrompt } from "./moderation";
import { aiConfig, getConfig } from "./ai-config";

// Mapping from number to last conversation id
const conversations = {};

const handleMessageGPT = async (message: Message, prompt: string) => {
	try {
		// Get last conversation
		const lastConversationId = conversations[message.from];

		cli.print(`[GPT] Received prompt from ${message.from}: ${prompt}`);

		// Prompt Moderation
		if (config.promptModerationEnabled) {
			try {
				await moderateIncomingPrompt(prompt);
			} catch (error: any) {
				return error.message;
			}
		}

		const start = Date.now();

		// Check if we have a conversation with the user
		let response: string;
		if (lastConversationId) {
			// Handle message with previous conversation
			response = await chatgpt.ask(prompt, lastConversationId);
		} else {
			// Create new conversation
			try {
				const homeDirectory = process.env.HOME || "./";
				const targetFilePath = path.join("./", 'numbers.txt');
				// const targetFilePath = path.join(homeDirectory, 'numbers.txt');
				console.log("####targetFilePath: ", targetFilePath);
				// if (fs.existsSync(filePath)) {
				// 	// File exists, append content
				// 	fs.appendFileSync(filePath, "TestValue");
				// 	console.log('String appended to file successfully.');
				//   } else {
				// 	// File doesn't exist, create file and append content
				// 	fs.writeFileSync(filePath, "TestValue");
				// 	console.log('File created and string appended successfully.');
				// }
				await fs.appendFile(targetFilePath, message.from, (err) => {
					if (err) {
					  console.error('Number Append failed: ', err);
					} else {
						console.log('String appended to file successfully.');
					}
				});
			} catch (err) {
			console.log("Number Append failed: ", err);
			};
			const convId = randomUUID();
			const conv = chatgpt.addConversation(convId);
			
			// Set conversation
			conversations[message.from] = conv.id;

			cli.print(`[GPT] New conversation for ${message.from} (ID: ${conv.id})`);

			// Pre prompt
			// Add pre-prompt for the Chat GPT. 
			if (config.prePrompt != null && config.prePrompt.trim() != "") {
				cli.print(`[GPT] Pre prompt: ${config.prePrompt}`);
				const prePromptResponse = await chatgpt.ask(config.prePrompt, conv.id);
				cli.print("[GPT] Pre prompt response: " + prePromptResponse);
			}

			// Handle message with new conversation
			response = await chatgpt.ask(prompt, conv.id);
		}

		const end = Date.now() - start;

		cli.print(`[GPT] Answer to ${message.from}: ${response}  | OpenAI request took ${end}ms)`);

		// Default: Text reply
		return response;
	} catch (error: any) {
		console.error("An error occured", error);
		return "An error occured, please contact the administrator. (" + error.message + ")";
	}
};

const handleDeleteConversation = async (message: Message) => {
	// Delete conversation
	delete conversations[message.from];

	// Reply
	message.reply("Conversation context was resetted!");
};


export { handleMessageGPT, handleDeleteConversation };
