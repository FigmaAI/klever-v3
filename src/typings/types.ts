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
  ERROR = 'ERROR'
}

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
}

export interface ScreenshotArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotInfo {
  nodeId: string;
  round: number;
  imageData: string;
}

export type PluginMessage = {
  type: 'init' | 'submit' | 'request-screenshot' | 'error';
  url?: string;
  password?: string;
  message?: string;
  nodeId?: string;
  data?: {
    taskDesc: string;
    personaDesc: string;
    screenshotInfo: ScreenshotInfo;
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
  model: string;
  temperature: number;
  maxTokens: number;
  modelType: string;
  baseUrl?: string;
  apiKey?: string;
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

export interface TaskFrameResult {
  taskFrame: FrameNode;
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
    round: number;
  };
}
