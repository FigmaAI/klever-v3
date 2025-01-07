import type { PluginMessage } from '../typings/types';
import {
  loadFonts,
  createTaskFrameWithNameAndDesc,
  createPreviewAndImageFrames,
  createAnatomyFrame,
  createModelResponseFrame,
  createActionImageFrame,
  createReflectionResponseFrame,
  getFrameImageBase64,
  createElemList,
  createReflectionFrames,
} from './FigmaUtils';
import { createModelInstance } from './api';
import { WebSocketClient } from './websocket';

figma.showUI(__html__, { width: 480, height: 640 });

const ws = WebSocketClient.getInstance();

// UI로부터의 메시지 처리
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'init') {
    try {
      await loadFonts();

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
  } else if (msg.type === 'create-task-frame') {
    try {
      const { taskDesc, personaDesc } = msg.data;

      // 1. load fonts
      await loadFonts();

      // 2. create task frame
      const taskFrame = await createTaskFrameWithNameAndDesc({
        taskDesc,
        personaDesc,
      });

      // 3. Create anatomy frame
      const anatomyFrame = createAnatomyFrame();
      taskFrame.appendChild(anatomyFrame);

      // 4. Move the taskFrame to the center of the viewport
      figma.viewport.scrollAndZoomIntoView([taskFrame]);

      // 5. Send only anatomyFrameId back to UI
      figma.ui.postMessage({
        type: 'task-frame-created',
        payload: {
          anatomyFrameId: anatomyFrame.id,
        },
      });
    } catch (error) {
      console.error('Error creating task frame:', error);
      figma.ui.postMessage({
        type: 'error',
        payload: {
          message: 'Failed to create task frame: ' + error.message,
        },
      });
    }
  } else if (msg.type === 'get-model-instance') {
    try {
      const modelInstance = await createModelInstance();

      // UI로 모델 인스턴스 직접 전송
      figma.ui.postMessage({
        type: 'model-instance-created',
        payload: modelInstance,
      });
    } catch (error) {
      console.error('Error creating model instance:', error);
      figma.ui.postMessage({
        type: 'error',
        payload: {
          message: 'Failed to create model instance: ' + error.message,
        },
      });
    }
  } else if (msg.type === 'create-preview-frames') {
    try {
      const { anatomyFrameId, roundCount, screenshotInfo, elemList } = msg.data;
      const anatomyFrame = (await figma.getNodeByIdAsync(anatomyFrameId)) as FrameNode;

      if (!anatomyFrame) {
        throw new Error('Anatomy frame not found');
      }

      const dimensions = await figma.clientStorage.getAsync('dimensions');

      const { previewFrame, labeledImageFrame } = await createPreviewAndImageFrames(
        anatomyFrame,
        screenshotInfo,
        dimensions,
        roundCount,
        elemList
      );

      // scroll to the preview frame
      figma.viewport.scrollAndZoomIntoView([previewFrame]);

      // send preview frame to UI
      const labeledImageFrameBase64 = await getFrameImageBase64(labeledImageFrame);
      figma.ui.postMessage({
        type: 'preview-frames-created',
        payload: {
          previewFrameId: previewFrame.id,
          labeledImageFrameBase64: labeledImageFrameBase64,
        },
      });
    } catch (error) {
      console.error('Error creating preview frames:', error);
      figma.ui.postMessage({
        type: 'error',
        payload: {
          message: 'Failed to create preview frames: ' + error.message,
        },
      });
    }
  } else if (msg.type === 'parse-explore-rsp') {
    const { previewFrameId, res, elemList, screenshotInfo, roundCount } = msg.payload;
    const previewFrame = (await figma.getNodeByIdAsync(previewFrameId)) as FrameNode;
    // create frames
    const modelResponseFrame = createModelResponseFrame(res.observation, res.thought, res.action, res.summary);
    const actionImageFrame = await createActionImageFrame(res.action, elemList, screenshotInfo, roundCount);

    // add frames to preview
    previewFrame.appendChild(actionImageFrame);
    previewFrame.appendChild(modelResponseFrame);

    // Scroll to the preview frame
    figma.viewport.scrollAndZoomIntoView([previewFrame]);
  } else if (msg.type === 'create-reflection-frame') {
    try {
      console.log('Received create-reflection-frame request:', msg.data);
      const { previewFrameId, screenshotInfo, roundCount, elemList } = msg.data;
      const dimensions = await figma.clientStorage.getAsync('dimensions');
      const previewFrame = (await figma.getNodeByIdAsync(previewFrameId)) as FrameNode;
      
      if (!previewFrame) throw new Error('Preview frame not found');

      const { labeledImageFrame } = await createReflectionFrames(
        previewFrame,
        screenshotInfo,
        dimensions,
        roundCount,
        elemList
      );

      console.log('Getting frame image base64...');
      const labeledImageFrameBase64 = await getFrameImageBase64(labeledImageFrame);
      
      console.log('Sending response to UI...');
      figma.ui.postMessage({
        type: 'reflection-frames-created',
        payload: {
          labeledImageFrameBase64: labeledImageFrameBase64,
        },
      });

    } catch (error) {
      console.error('Error creating reflection frames:', error);
      figma.notify('Failed to create reflection frames: ' + error.message, { error: true });
      figma.ui.postMessage({
        type: 'error',
        payload: {
          message: 'Failed to create reflection frames: ' + error.message
        }
      });
    }
  } else if (msg.type === 'parse-reflect-rsp') {
    const { previewFrameId, decision, thought } = msg.payload;
    const previewFrame = (await figma.getNodeByIdAsync(previewFrameId)) as FrameNode;

    if (!previewFrame) throw new Error('Preview frame not found');

    const reflectionResponseFrame = createReflectionResponseFrame(decision, thought);
    previewFrame.appendChild(reflectionResponseFrame);

    // Scroll to the preview frame
    figma.viewport.scrollAndZoomIntoView([previewFrame]);
  } else if (msg.type === 'create-elem-list') {
    try {
      const { nodeId, uselessList } = msg;
      const node = await figma.getNodeByIdAsync(nodeId) as SceneNode;
      
      if (!node) {
        throw new Error('Node not found');
      }

      const elemList = await createElemList(node, uselessList);

      figma.ui.postMessage({
        type: 'elem-list-created',
        payload: {
          elemList
        }
      });
    } catch (error) {
      console.error('Error creating element list:', error);
      figma.ui.postMessage({
        type: 'error',
        payload: {
          message: 'Failed to create element list: ' + error.message
        }
      });
    }
  }
};

// WebSocket cleanup on plugin close
figma.on('close', () => {
  ws.close();
});
