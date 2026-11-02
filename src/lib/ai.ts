import { askGemini, listGeminiModels } from './gemini';
import { type ChatMsg, type Provider, askOpenAI, listModels } from './openai';
import { getApiKey } from './storage';

/** Send a chat to whichever provider is selected. Each key only ever goes to its own provider. */
export function askAI(provider: Provider, model: string, messages: ChatMsg[]) {
  return provider === 'gemini'
    ? askGemini({ apiKey: getApiKey('gemini'), model, messages })
    : askOpenAI({ apiKey: getApiKey('openai'), model, messages });
}

export function listModelsFor(provider: Provider, apiKey: string) {
  return provider === 'gemini' ? listGeminiModels(apiKey) : listModels(apiKey);
}
