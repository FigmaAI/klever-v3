import { Config } from '../typings/types';

// default config values
const defaultConfig: Config = {
  MODEL: "OpenAI",  // must be either OpenAI or Qwen
  OPENAI_API_BASE: "https://api.openai.com/v1/chat/completions",
  OPENAI_API_KEY: "",  // empty string for now
  OPENAI_API_MODEL: "gpt-4o",  // The only OpenAI model by now that accepts visual input
  MAX_TOKENS: 300,  // The max token limit for the response completion
  TEMPERATURE: 0.0,  // The lower the value, the more consistent the output
  REQUEST_INTERVAL: 10,  // Time in seconds between consecutive GPT-4V requests
  MAX_ROUNDS: 20  // Set the round limit for the agent to complete the task
};

// async function to get config object
export async function getConfig(): Promise<Config> {
  try {
    // get API key from clientStorage
    const storedApiKey = await figma.clientStorage.getAsync('openai-api-key');
    
    return {
      ...defaultConfig,
      OPENAI_API_KEY: storedApiKey || defaultConfig.OPENAI_API_KEY
    };
  } catch (error) {
    console.error('Error loading config:', error);
    return defaultConfig;
  }
}

// async function to set API key
export async function setApiKey(apiKey: string): Promise<void> {
  await figma.clientStorage.setAsync('openai-api-key', apiKey);
} 