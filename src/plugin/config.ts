import { Config } from '../typings/types';

// 기본 설정값
const defaultConfig: Config = {
  MODEL: "OpenAI",  // must be either OpenAI or Qwen
  OPENAI_API_BASE: "https://api.openai.com/v1/chat/completions",
  OPENAI_API_KEY: "",  // 빈 문자열로 초기화
  OPENAI_API_MODEL: "gpt-4o",  // The only OpenAI model by now that accepts visual input
  MAX_TOKENS: 300,  // The max token limit for the response completion
  TEMPERATURE: 0.0,  // The lower the value, the more consistent the output
  REQUEST_INTERVAL: 10  // Time in seconds between consecutive GPT-4V requests
};

// config 객체를 가져오는 비동기 함수
export async function getConfig(): Promise<Config> {
  try {
    // clientStorage에서 API 키 가져오기
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

// API 키를 저장하는 함수
export async function setApiKey(apiKey: string): Promise<void> {
  await figma.clientStorage.setAsync('openai-api-key', apiKey);
} 