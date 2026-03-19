let session: LanguageModel | null = null;

export async function generateContent(message: string, conversation: LanguageModelMessage[], onDownload: (loaded: number) => void, onMessage: (message: string) => void, onChunk: (chunk: string) => void, images?: Blob[], audios?: Blob[]): Promise<string> {
	if (!('LanguageModel' in window)) throw new Error('Prompt API not available, please use a browser that supports the Prompt API such as Google Chrome.');

	if (!session) {
		onMessage('Checking for Prompt API availability...');

		const availability = await LanguageModel.availability();

		switch (availability) {
			case 'available':
				console.log('Prompt API available.');
				break;

			case 'downloadable':
				console.log('Prompt API downloadable.');
				break;

			case 'downloading':
				console.log('Prompt API downloading.');
				break;

			case 'unavailable':
				throw new Error("Prompt API unavailable. Please enable the 'optimization-guide-on-device-model' and 'prompt-api-for-gemini-nano-multimodal-input' flags.");
		}

		onMessage('Creating LanguageModel instance...');

		const systemPrompt: LanguageModelSystemMessage = { role: 'system', content: [{ type: 'text', value: 'You are Gemini Nano, part of the Chrome Built-in AI. You are friendly and hlpful.' }] };

		session = await LanguageModel.create({
			monitor(m) {
				m.addEventListener('downloadprogress', (e) => {
					onDownload(e.loaded);
				});
			},
			initialPrompts: [systemPrompt, ...conversation],
			expectedInputs: [{ type: 'text' } /*{ type: 'image' }, { type: 'audio' }*/],
			expectedOutputs: [{ type: 'text' }],
		});
	}

	onMessage('Generating response...');

	const imageAttachments: LanguageModelMessageContent[] = [];
	const audioAttachments: LanguageModelMessageContent[] = [];

	if (images && images.length !== 0) {
		for (const image of images) {
			imageAttachments.push({ type: 'image', value: image });
		}
	}

	if (audios && audios.length !== 0) {
		for (const audio of audios) {
			audioAttachments.push({ type: 'audio', value: audio });
		}
	}

	const stream = session.promptStreaming([
		{
			role: 'user',
			content: [
				{
					type: 'text',
					value: message,
				},
				...imageAttachments,
				...audioAttachments,
			],
		},
	]);

	let response: string = '';

	for await (const chunk of stream) {
		onChunk(chunk);
		response += chunk;
	}

	return response;
}
