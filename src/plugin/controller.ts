import type { PluginMessage } from '../typings/types';
import { WebSocketClient } from './websocket';
import {
  createTaskFrameWithNameAndDesc,
  createPreviewAndImageFrames,
  sendNodeInfoToUI,
  getImageBase64,
  processAIResponseAndCreateFrames,
  updateExplorationState,
  // checkTrialStatus
} from './FigmaUtils';
import { createModelInstance } from './api';
import { createPromptForTask } from './prompts';  // Import prompt generator

figma.showUI(__html__, { width: 480, height: 640 });

const ws = WebSocketClient.getInstance();

// 플러그인 시작 시 초기화
figma.on('selectionchange', () => {
  sendNodeInfoToUI();
});

// 플러그인 실행 시 초기화
figma.on('run', async () => {
  try {
    // await checkTrialStatus();  // 일단 주석처리
    sendNodeInfoToUI();
  } catch (error) {
    console.error('Error during plugin initialization:', error);
    figma.notify('Failed to initialize plugin', { error: true });
  }
});

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
            }
          }
        });
        console.log('INIT message sent to UI');
      } catch (error) {
        console.error('Failed to send INIT message:', error);
        throw error;
      }
    } catch (error) {
      console.error('Initialization error details:', {
        error: error,
        message: error.message,
        stack: error.stack,
      });
      figma.notify('Failed to initialize', { error: true });

      figma.ui.postMessage({
        type: 'error',
        message: error.message,
      });
    }
  } else if (msg.type === 'submit' && typeof msg.data !== 'string') {
    try {
      const { taskDesc, personaDesc, screenshotInfo } = msg.data;
      
      // WebSocket 응답 데이터 로깅
      console.log('WebSocket response data:', {
        type: msg.type,
        taskDesc,
        personaDesc,
        screenshotInfo: {
          nodeId: screenshotInfo?.nodeId,
          round: screenshotInfo?.round,
          hasImageData: !!screenshotInfo?.imageData
        }
      });

      if (!screenshotInfo?.imageData) {
        throw new Error('Screenshot info or image data is missing');
      }

      // 1. Create task frame
      const { taskFrame } = await createTaskFrameWithNameAndDesc({
        taskDesc,
        personaDesc,
      });

      // 2. Get stored dimensions and create preview frames
      const dimensions = await figma.clientStorage.getAsync('dimensions');
      const { previewFrame, originalImage, labeledImage } = await createPreviewAndImageFrames(
        screenshotInfo.nodeId,
        taskFrame,
        screenshotInfo.round,
        screenshotInfo.imageData,
        dimensions
      );

      // 3. Generate prompt and get AI response
      try {
        // nodeId가 변경될 때마다 상태 업데이트
        await updateExplorationState(screenshotInfo.nodeId);

        const modelInstance = await createModelInstance();
        const labeledImageBase64 = await getImageBase64(labeledImage);
        
        const prompt = createPromptForTask(taskDesc, personaDesc);
        const response = await modelInstance.getModelResponse(prompt, [labeledImageBase64]);
        
        if (!response.success) {
          throw new Error(`AI model error: ${response.error}`);
        }

        const actionInfo = await processAIResponseAndCreateFrames(
          response.data,
          previewFrame,
          labeledImage
        );

        // WebSocket을 통해 action 정보 전송
        figma.ui.postMessage({
          type: 'websocket-send',
          data: {
            type: 'EXECUTE_ACTION',
            payload: {
              actionType: actionInfo.actionType,
              params: actionInfo.actionParams,
              summary: actionInfo.summary
            }
          }
        });

        // UI에 완료 알림
        figma.ui.postMessage({
          type: 'explore-complete',
          payload: {
            previewFrameId: previewFrame.id,
            originalImageId: originalImage.id,
            labeledImageId: labeledImage.id,
            aiResponse: response.data
          },
        });

      } catch (error) {
        console.error('AI analysis error:', error);
        figma.notify('Failed to analyze interface: ' + error.message, { error: true });
        
        figma.ui.postMessage({
          type: 'explore-complete',
          payload: {
            previewFrameId: previewFrame.id,
            originalImageId: originalImage.id,
            labeledImageId: labeledImage.id,
            error: error.message
          },
        });
      }
    } catch (error) {
      console.error('Error:', error);
      figma.notify('Error: ' + error.message, { error: true });
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
  }
};

// 플러그인 종료 시 정리
figma.on('close', () => {
  ws.close();
});
