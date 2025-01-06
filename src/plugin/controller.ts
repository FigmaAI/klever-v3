import type { PluginMessage, ScreenshotInfo } from '../typings/types';
import {
  loadFonts,
  errorMessageHandler,
  createTaskFrameWithNameAndDesc,
  createPreviewAndImageFrames,
  createAnatomyFrame,
  parseExploreRsp,
  createModelResponseFrame,
  createActionImageFrame,
  parseAction,
} from './FigmaUtils';
import { AIModel, createModelInstance } from './api';
import { createPromptForTask } from './prompts';
import { WebSocketClient } from './websocket';

figma.showUI(__html__, { width: 480, height: 640 });

const ws = WebSocketClient.getInstance();

const requestAIModelAndProcessResponse = async (prompt: string, screenshotInfo: ScreenshotInfo, modelInstance: AIModel) => {
  try {
   
    const imageBase64 = screenshotInfo.imageData;
    const response = await modelInstance.getModelResponse(prompt, [imageBase64]);
    return response;
  } catch (error) {
    console.error('Error in requestAIModelAndProcessResponse:', error);
    figma.notify('An error occurred while processing AI model response', { timeout: 3000 });
    throw error;
  }
};

let isInterviewStopped = false;

// UI로부터의 메시지 처리
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'init') {
    try {
      const { url, password } = msg;
      // Extract starting-point-node-id from URL
      const startingNodeMatch = url.match(/starting-point-node-id=([^&]+)/);
      console.log('Starting node match result:', startingNodeMatch);

      if (!startingNodeMatch) {
        throw new Error('Failed to extract starting point node ID from URL');
      }

      // Convert nodeId format and decode URI component
      const nodeId = decodeURIComponent(startingNodeMatch[1]).replace('-', ':');

      // 1. Get the node using nodeId
      const node = await figma.getNodeByIdAsync(nodeId);

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
    try {
      isInterviewStopped = false;
      // set metadata
      const { taskData, screenshotInfo } = msg.data;
      console.log('Received from UI:', msg.data);
      const dimensions = await figma.clientStorage.getAsync('dimensions');
      let round_count = 0;
      let useless_list = [];
      let last_act = 'None';
      let task_complete = false;

      // set loading
      figma.ui.postMessage({
        type: 'loading',
        payload: { loading: true, message: 'preparing an interview...' }
      });

      // 1. load data
      await loadFonts();

      // 2. create task frame
      const taskFrame = await createTaskFrameWithNameAndDesc(taskData);

      // Create new instance for each request
      const modelInstance = await createModelInstance();
      console.log(`Created new modelInstance for ${taskFrame.name}`, modelInstance);
      // Move the taskFrame to the center of the viewport
      figma.viewport.scrollAndZoomIntoView([taskFrame]);
      // send taskFrame to the UI
      figma.ui.postMessage({
        type: 'loading',
        payload: { loading: true, message: 'Start interviewing...' }
      });

      // Create anatomy frame
      const anatomyFrame = createAnatomyFrame();
      taskFrame.appendChild(anatomyFrame);

      // For loop for the rounds of interviewing
      while (round_count < modelInstance.maxRounds && !isInterviewStopped) {
        round_count += 1;
        
        // create frames for the task and the image
        const { previewFrame, elemList } = await createPreviewAndImageFrames(
          anatomyFrame,
          screenshotInfo,
          dimensions,
          round_count
        );

        // scroll to the preview frame
        figma.viewport.scrollAndZoomIntoView([previewFrame]);

        // Send loading message to UI
        figma.ui.postMessage({
          type: 'loading',
          payload: { loading: true, message: `Starting round ${round_count}...` }
        });

        // Create prompt and ask for AppAgent
        let prompt = createPromptForTask(taskData);
        prompt = prompt.replace('<last_act>', last_act);
        const response = await requestAIModelAndProcessResponse(prompt, screenshotInfo, modelInstance);

        if (response) {
          const res = await parseExploreRsp(JSON.stringify(response));

          // create frames
          const modelResponseFrame = createModelResponseFrame(res.observation, res.thought, res.action, res.summary);
          const actionImageFrame = await createActionImageFrame(res.action, elemList, screenshotInfo, round_count);

          // add frames to preview
          previewFrame.appendChild(actionImageFrame);
          previewFrame.appendChild(modelResponseFrame);
          
          // Scroll to the preview frame
          figma.viewport.scrollAndZoomIntoView([previewFrame]);
          
          // Send loading message to UI
          figma.ui.postMessage({
            type: 'loading',
            payload: { loading: true, message: 'Thinking about what to do in the next step...' }
          });
          
          // Parse action details
          const actionDetails = parseAction(res.action);
          const actName = actionDetails.actName;
          last_act = res.summary;
          
          if (actName === "FINISH") {
            task_complete = true;
            break;
          }

          if (["tap", "long_press", "swipe"].includes(actName)) {
            try {
              // Get args from the action parsing result
              const { actName, args } = parseAction(res.action);
              const [areaNum, ...rest] = args.split(',').map(arg => arg.trim());
              const area = parseInt(areaNum) - 1;
              
              if (isNaN(area) || area < 0) {
                throw new Error('Invalid area number');
              }

              // Get the element's bounding box
              const elem = elemList[area];
              if (!elem) {
                throw new Error(`Element not found at index ${area}`);
              }

              // Send the action to UI for execution
              figma.ui.postMessage({
                type: 'execute-action',
                payload: {
                  action: actName,
                  bbox: elem.bbox,
                  ...(actName === 'swipe' && {
                    direction: rest[0],
                    distance: rest[1] || 'medium'
                  })
                }
              });

            } catch (error) {
              console.error('Error executing action:', error);
              figma.notify('Failed to execute action: ' + error.message, { error: true });
            }
          }
          
        } else {
          errorMessageHandler('Failed to get response from AI');
        }
      }

      // 중단된 경우 메시지 표시
      if (isInterviewStopped) {
        figma.notify('Interview stopped by user', { timeout: 3000 });
      }

      // 로딩 상태 해제
      figma.ui.postMessage({ 
        type: 'loading', 
        payload: { loading: false, message: '' }
      });

      // 5. turn off loading
      figma.ui.postMessage({ type: 'loading', message: false });
      figma.notify('Report generated successfully', { timeout: 3000 });
    } catch (error) {
      figma.ui.postMessage({ type: 'loading', message: false });
      console.error(error);
      errorMessageHandler(error.message || 'An unexpected error occurred');
    }
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
  } else if (msg.type === 'stopInterview') {
    isInterviewStopped = true;
    figma.notify('Stopping interview...', { timeout: 2000 });
  }
};

// WebSocket cleanup on plugin close
figma.on('close', () => {
  ws.close();
});
