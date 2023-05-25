import { MessageMedia } from "whatsapp-web.js";
import { openai } from "../providers/openai";
import { aiConfig } from "../handlers/ai-config";
import { CreateImageRequestSizeEnum } from "openai";
import config from "../config";
import * as cli from "../cli/ui";

// Moderation
import { moderateIncomingPrompt } from "./moderation";

const handleMessageDALLE = async (message: any, prompt: any) => {
	try {
		const start = Date.now();

		cli.print(`[DALL-E] Received prompt from ${message.from}: ${prompt}`);

		// Prompt Moderation
		if (config.promptModerationEnabled) {
			try {
				await moderateIncomingPrompt(prompt);
			} catch (error: any) {
				return error.message;
			}
		}

		// Send the prompt to the API
		const response = await openai.createImage({
			prompt: `${config.dallePrePrompt} ${prompt}`,
			n: 1,
			size: aiConfig.dalle.size as CreateImageRequestSizeEnum,
			// response_format: "url"
		});

		const end = Date.now() - start;

		const imageUrl = response.data.data[0].url;
		// const base64 = response.data.data[0].b64_json as string;
		// const image = new MessageMedia("image/jpeg", base64, "image.jpg");

		cli.print(`[DALL-E] Answer to ${message.from} | OpenAI request took ${end}ms`);
		return imageUrl;
		// message.reply(image);
	} catch (error: any) {
		// console.error("An error occured", error);
		console.error("An error occured, while fetching IMAGE (" + error.message + ")");
		return "An error occured, while fetching IMAGE (" + error.message + ").";
	}
};

export { handleMessageDALLE };
