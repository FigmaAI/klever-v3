import type { ImageDimensions, PluginMessage, ScreenshotInfo, TaskData } from '../typings/types';
import {
  loadFonts,
  errorMessageHandler,
  createTaskFrameWithNameAndDesc,
  getFrameImageBase64,
  getGenerateReportPrompt,
  generateReportResult,
} from './FigmaUtils';
import { createModelInstance } from './api';
import { WebSocketClient } from './websocket';

// Create model instance
let modelInstance = createModelInstance();

console.log('Initial modelInstance:', modelInstance);

figma.showUI(__html__, { width: 480, height: 640 });

const ws = WebSocketClient.getInstance();

async function generateReport(taskData: TaskData, screenshotInfo: ScreenshotInfo, dimension?: ImageDimensions) {
  try {
    // set loading
    figma.ui.postMessage({ type: 'loading', message: true });

    // 1. load data
    await loadFonts();

    // 2. create task frame
    const taskFrame = await createTaskFrameWithNameAndDesc(taskData);

    // send taskFrame as a reportNode to the UI
    figma.ui.postMessage({ type: 'reportNode', message: taskFrame.id });

    // load dimensions if it is not provided
    if (!dimension) {
      dimension = await figma.clientStorage.getAsync('dimensions');
    }

    // 3. create report
    const { prompt, previewFrameId, beforeImageFrameId, labeledImageFrameId, elemList } = await getGenerateReportPrompt(
      taskData,
      taskFrame,
      screenshotInfo,
      dimension
    );

    // 4. Get AI response
    const response = await requestAIModelAndProcessResponse(prompt, labeledImageFrameId);

    if (response) {
      await generateReportResult(
        response,
        previewFrameId,
        beforeImageFrameId,
        elemList,
        screenshotInfo,
        taskFrame
      );
    } else {
      errorMessageHandler('Failed to get response from AI');
    }

    // 5. turn off loading
    figma.ui.postMessage({ type: 'loading', message: false });
    figma.notify('Report generated successfully', { timeout: 3000 });
  } catch (error) {
    figma.ui.postMessage({ type: 'loading', message: false });
    console.error(error);
    errorMessageHandler(error.message || 'An unexpected error occurred');
  }
}

const requestAIModelAndProcessResponse = async (prompt: string, imageId: string) => {
  try {
    // Create new instance for each request
    const modelInstance = await createModelInstance();
    console.log('Created new modelInstance:', modelInstance);

    if (typeof modelInstance?.getModelResponse !== 'function') {
      console.error('modelInstance details:', {
        isPromise: modelInstance instanceof Promise,
        properties: Object.keys(modelInstance || {})
      });
      throw new Error('modelInstance.getModelResponse is not a function');
    }

    const imageBase64 = await getFrameImageBase64(await figma.getNodeByIdAsync(imageId) as SceneNode);
    const response = await modelInstance.getModelResponse(prompt, [imageBase64]);
    return response;
  } catch (error) {
    console.error('Error in requestAIModelAndProcessResponse:', error);
    figma.notify('An error occurred while processing AI model response', { timeout: 3000 });
    throw error;
  }
};

// UI로부터의 메시지 처리
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'init') {
    try {
      const { url, password } = msg;
      console.log('Received URL:', url);

      // Extract starting-point-node-id from URL
      const startingNodeMatch = url.match(/starting-point-node-id=([^&]+)/);
      console.log('Starting node match result:', startingNodeMatch);

      if (!startingNodeMatch) {
        throw new Error('Failed to extract starting point node ID from URL');
      }

      // Convert nodeId format and decode URI component
      const nodeId = decodeURIComponent(startingNodeMatch[1]).replace('-', ':');
      console.log('Converted starting nodeId:', nodeId);

      // 1. Get the node using nodeId
      const node = await figma.getNodeByIdAsync(nodeId);
      console.log('Retrieved node:', node);

      if (!node || !('absoluteBoundingBox' in node)) {
        console.error('Node or bounding box not found:', {
          node: node,
          type: node?.type,
          hasBoundingBox: node && 'absoluteBoundingBox' in node,
        });
        throw new Error('Invalid node or bounding box not found');
      }

      const bbox = node.absoluteBoundingBox;
      if (!bbox) {
        console.error('No bounding box found');
        throw new Error('No bounding box found');
      }

      // 2. Store dimensions directly from node
      const dimensions = {
        width: bbox.width,
        height: bbox.height,
      };
      console.log('Dimensions from node:', dimensions);

      await figma.clientStorage.setAsync('dimensions', dimensions);

      // WebSocket 연결 상태 확인 및 로깅 추가
      console.log('WebSocket ready state:', ws.readyState);

      try {
        // UI를 통해 WebSocket 메시지 전송
        figma.ui.postMessage({
          type: 'websocket-send',
          data: {
            type: 'INIT',
            payload: {
              url,
              password,
              width: dimensions.width,
              height: dimensions.height,
            },
          },
        });
        console.log('INIT message sent to UI');
      } catch (error) {
        console.error('Failed to send INIT message:', error);
        throw error;
      }
    } catch (error) {
      console.error('Initialization error:', error);
      figma.notify('Failed to initialize: ' + error.message, { error: true });
    }
  } else if (msg.type === 'submit') {
    const { taskData, screenshotInfo } = msg.data;
    const dimensions = await figma.clientStorage.getAsync('dimensions');
    console.log('Received from UI:', msg.data);
    await generateReport(taskData, screenshotInfo, dimensions);
  } else if (msg.type === 'saveApiKey') {
    const apiKey: string = msg.data;
    await figma.clientStorage.setAsync('openai-api-key', apiKey);
    figma.notify('API key has been saved', { timeout: 2000 });
    figma.ui.postMessage({ type: 'currentApiKey', message: apiKey });
  } else if (msg.type === 'deleteApiKey') {
    await figma.clientStorage.deleteAsync('openai-api-key');
    figma.notify('API key has been deleted', { timeout: 2000 });
    figma.ui.postMessage({ type: 'currentApiKey', message: '' });
  } else if (msg.type === 'getCurrentApiKey') {
    const apiKey = await figma.clientStorage.getAsync('openai-api-key');
    figma.ui.postMessage({ type: 'currentApiKey', message: apiKey || '' });
  }
};

// WebSocket cleanup on plugin close
figma.on('close', () => {
  ws.close();
});
