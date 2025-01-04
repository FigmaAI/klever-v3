import { AIModelConfig } from '../typings/types';
import { getConfig } from './config';

export class AIModel {
  model: string;
  temperature: number;
  maxTokens: number;
  modelType: string;
  baseUrl: string;
  apiKey: string;

  constructor(config: AIModelConfig) {
    this.model = config.model;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
    this.modelType = config.modelType;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async getModelResponse(prompt: string, images: string[]) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: [{ type: 'text', text: prompt }],
            },
            {
              role: 'user',
              content: images.map((image) => ({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${image}` },
              })),
            },
          ],
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        console.error(`${this.modelType} Model error:`, data.error || 'Unknown error');
        return { success: false, error: data.error || 'Unknown error' };
      }

      const content = data.choices[0].message.content;
      console.log('Raw response content:', content);
      
      return content;

    } catch (error) {
      console.error('Fetch error:', error);
      return { success: false, error: error.message };
    }
  }
}

export async function createModelInstance() {
  const config = await getConfig();
  
  return new AIModel({
    model: config.OPENAI_API_MODEL,
    temperature: config.TEMPERATURE,
    maxTokens: config.MAX_TOKENS,
    modelType: config.MODEL,
    baseUrl: config.OPENAI_API_BASE,
    apiKey: config.OPENAI_API_KEY
  });
} 