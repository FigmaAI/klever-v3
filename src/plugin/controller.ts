import { PluginMessage } from '../typings/types';
import { WebSocketClient } from './websocket';
import {
  createTaskFrameWithNameAndDesc,
  createPreviewAndImageFrames,
  sendNodeInfoToUI,
  // checkTrialStatus
} from './FigmaUtils';

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

      // 3. Send initialization request to server via WebSocket
      ws.send({
        type: 'INIT',
        payload: {
          url,
          password,
          width: dimensions.width,
          height: dimensions.height,
        },
      });
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
  } else if (msg.type === 'submit') {
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

      // 2. Get stored dimensions
      const dimensions = await figma.clientStorage.getAsync('dimensions');
      console.log('Retrieved dimensions:', dimensions);

      if (!dimensions) {
        throw new Error('Dimensions not found');
      }

      // 3. Create preview frames with original and labeled images
      console.log('Creating preview frames with:', {
        nodeId: screenshotInfo.nodeId,
        round: screenshotInfo.round,
        hasImageData: !!screenshotInfo.imageData,
        dimensions,
      });

      const { previewFrame, originalImage, labeledImage } = await createPreviewAndImageFrames(
        screenshotInfo.nodeId,
        taskFrame,
        screenshotInfo.round,
        screenshotInfo.imageData,
        dimensions
      );

      // 4. Notify UI of completion
      figma.ui.postMessage({
        type: 'explore-complete',
        payload: {
          previewFrameId: previewFrame.id,
          originalImageId: originalImage.id,
          labeledImageId: labeledImage.id,
        },
      });
    } catch (error) {
      console.error('Error:', error);
      figma.notify('Error: ' + error.message, { error: true });
    }
  }
};

// 플러그인 종료 시 정리
figma.on('close', () => {
  ws.close();
});
