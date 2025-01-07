// types.ts

export enum WSMessageType {
  INIT = 'INIT',
  GET_SCREENSHOT = 'GET_SCREENSHOT',
  EXECUTE_ACTION = 'EXECUTE_ACTION'
}

export interface WSMessage {
  type: WSMessageType;
  status?: 'success' | 'error';
  payload?: InitResponse | ScreenshotInfo | ErrorPayload;
}

// 기본 인터페이스
export interface ScreenshotInfo {
  nodeId: string;
  imageData: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface UIElement {
  id: string;
  type: string;
  name: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface TaskData {
  taskDesc: string;
  personaDesc?: string;
}

// AI 모델 관련
export interface AIModelConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  modelType?: string;
  baseUrl?: string;
  apiKey: string;
  maxRounds: number;
}

export interface ExploreResponse {
  observation: string;
  thought: string;
  action: string;
  summary: string;
}

// 초기화 응답
export interface InitResponse {
  fileKey: string;
  message: string;
  width: number;
  height: number;
}

// 플러그인 메시지 타입
export type PluginMessage =
  | { type: 'init'; url: string; password: string }
  | { type: 'saveApiKey'; data: string }
  | { type: 'deleteApiKey' }
  | { type: 'getCurrentApiKey' }
  | { type: 'currentApiKey'; message: string }
  | { type: 'websocket-send'; data: WSMessage }
  | { type: 'get-model-instance' }
  | { type: 'model-instance-created'; payload: AIModelConfig }
  | { 
      type: 'create-task-frame';
      data: {
        taskDesc: string;
        personaDesc: string;
      }
    }
  | {
      type: 'create-preview-frames';
      data: {
        anatomyFrameId: string;
        roundCount: number;
        screenshotInfo: ScreenshotInfo;
        elemList: UIElement[];
      };
    }
  | {
      type: 'parse-explore-rsp';
      payload: {
        previewFrameId: string;
        res: ExploreResponse;
        elemList: UIElement[];
        screenshotInfo: ScreenshotInfo;
        roundCount: number;
      }
    }
  | {
      type: 'create-reflection-frame';
      data: {
        previewFrameId: string;
        screenshotInfo: ScreenshotInfo;
        roundCount: number;
        elemList: UIElement[];
      }
    }
  | {
      type: 'parse-reflect-rsp';
      payload: {
        previewFrameId: string;
        decision: string;
        thought: string;
      }
    }
  | { type: 'error'; payload: { message: string } }
  | {
      type: 'create-elem-list';
      nodeId: string;
      uselessList: string[];
    }
  | {
      type: 'elem-list-created';
      payload: {
        elemList: UIElement[];
      }
    };

export interface Config {
  MODEL: string;
  OPENAI_API_BASE: string;
  OPENAI_API_KEY: string;
  OPENAI_API_MODEL: string;
  MAX_TOKENS: number;
  TEMPERATURE: number;
  REQUEST_INTERVAL: number;
  MAX_ROUNDS: number;
}

export interface ErrorPayload {
  message: string;
}

// Preview 프레임 생성 결과를 위한 인터페이스 추가
export interface PreviewFramesResult {
  previewFrameId: string;
  labeledImageFrameBase64: string;
}

export interface ReflectionFramesResult {
  labeledImageFrameBase64: string;
}