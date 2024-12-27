// types.ts

export interface ServerResponse {
  status: 'success' | 'error' | 'in_progress';
  message: string;
  data?: any;
}

export enum WSMessageType {
  INIT = 'INIT',
  CLOSE = 'CLOSE',
  START_TEST = 'START_TEST',
  STOP_TEST = 'STOP_TEST',
  GET_STATUS = 'GET_STATUS',
  SCREENSHOT = 'SCREENSHOT',
  STATUS_UPDATE = 'STATUS_UPDATE',
  TEST_COMPLETE = 'TEST_COMPLETE',
  ERROR = 'ERROR'
}

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
}

export interface TestConfig {
  url: string;
  password?: string;
  taskDesc?: string;
  personaDesc?: string;
}

export interface ScreenshotData {
  imageUrl: string;
  timestamp: number;
  elements?: UIElement[];
}

export interface UIElement {
  uid: string;
  bbox: [number, number, number, number];
  type?: string;
  text?: string;
}

export type PluginMessage = 
  | { type: 'init'; url: string; password?: string }
  | { type: 'explore'; taskDesc: string; personaDesc?: string }
  | { type: 'stop-exploration' }
  | { type: 'exploration-status' }
  | { type: 'reset' }
  | { type: 'error'; message: string };

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
