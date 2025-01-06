// types.ts

export interface ServerResponse {
  status: 'success' | 'error';
  message: string;
  data?: any;
}

export enum WSMessageType {
  INIT = 'INIT',
  CLOSE = 'CLOSE',
  TASK_SETUP = 'TASK_SETUP',
  GET_SCREENSHOT = 'GET_SCREENSHOT',
  SCREENSHOT = 'SCREENSHOT',
  ERROR = 'ERROR',
  EXECUTE_ACTION = 'EXECUTE_ACTION',
  GET_EXPLORATION = 'GET_EXPLORATION',
  GET_REFLECTION = 'GET_REFLECTION',
  EXPLORATION_COMPLETE = 'EXPLORATION_COMPLETE'
}

export interface WSMessage {
  type: WSMessageType;
  status?: 'success' | 'error';
  payload?:
    | InitResponse
    | {
        message: string;
        nodeId?: string;
        imageData?: string;
      };
}

export interface ScreenshotArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotInfo {
  nodeId: string;
  imageData: string;
}

export interface TaskSubmitData {
  taskDesc: string;
  personaDesc: string;
  screenshotInfo: ScreenshotInfo;
}

export type PluginMessage =
  | { type: 'init'; url: string; password: string }
  | { type: 'error'; message: string }
  | { type: 'saveApiKey'; data: string }
  | { type: 'deleteApiKey' }
  | { type: 'getCurrentApiKey' }
  | { type: 'currentApiKey'; message: string }
  | { type: 'websocket-send'; data: WSMessage }
  | { type: 'stopInterview' }
  | {
      type: 'loading';
      payload: {
        loading: boolean;
        message: string;
      };
    }
  | {
      type: 'submit';
      data: {
        taskData: {
          taskDesc: string;
          personaDesc: string;
        };
        screenshotInfo: {
          nodeId: string;
          imageData: string;
        };
      };
    }
  | {
      type: 'execute-action';
      payload: {
        action: string;
        centerX: number;
        centerY: number;
        direction?: string;
        distance?: string;
      };
    };

export interface ParsedReport {
  title: string;
  taskName: string;
  taskDesc: string;
  personaDesc: string;
  rounds: Promise<ParsedRound>[];
}

export interface ParsedRound {
  images: string[];
  observation: string;
  thoughts: string[];
  action: string;
  summary: string;
  decision: string;
}

// Defines the type for UI elements
export interface UIElement {
  id: string;
  type: string;
  name: string;
  bbox: { x: number; y: number; width: number; height: number };
}

// Defines the configuration type passed to the AI model constructor
export interface AIModelConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  modelType?: string;
  baseUrl?: string;
  apiKey: string;
  maxRounds: number;
}

// Defines the response type from the AI model
export interface AIModelResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface TaskData {
  taskDesc: string;
  personaDesc?: string;
}

export interface PreviewFrameResult {
  previewFrame: FrameNode;
  originalImage: FrameNode;
  labeledImage: FrameNode;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface WSScreenshotResponse {
  type: WSMessageType.SCREENSHOT;
  status: 'success' | 'error';
  payload: {
    nodeId: string;
    imageData: string;
  };
}

// Config interface for OpenAI settings
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

export interface ExploreResponse {
  observation: string;
  thought: string;
  action: string;
  summary: string;
}

export interface InitResponse {
  fileKey: string;
  message: string;
  screenshotArea: ScreenshotArea;
  taskDir: string;
}

// 기존 타입 정의에 추가
export interface WebSocketResponse {
  type: string;
  status: 'success' | 'error';
  payload: InitResponse;
}

export interface ExplorationState {
  currentRound: number;
  taskComplete: boolean;
  lastAction: string;
  uselessElements: string[];
}

export interface ExplorationResponse {
  observation: string;
  thought: string;
  action: string;
  summary: string;
}

export interface ReflectionResponse {
  decision: 'SUCCESS' | 'INEFFECTIVE' | 'FINISH';
  summary: string;
  elementId?: string;
}

export interface RoundData {
  round: number;
  beforeImage: string;
  afterImage: string;
  response: ExplorationResponse;
  reflection: ReflectionResponse;
}
