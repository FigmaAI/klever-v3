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

export type PluginMessage = {
  type: 'init' | 'request-screenshot' | 'error';
  url?: string;
  password?: string;
  message?: string;
  nodeId?: string;
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