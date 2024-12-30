import { PluginMessage } from '../typings/types';
import { WebSocketClient } from './websocket';

figma.showUI(__html__, { width: 480, height: 640 });

const ws = WebSocketClient.getInstance();

figma.ui.onmessage = async (msg: PluginMessage) => {
    try {
        switch (msg.type) {
            case 'init':
                try {
                    const figmaNodeId = msg.nodeId.replace('-', ':');
                    const node = await figma.getNodeByIdAsync(figmaNodeId);
                    
                    // 프로토타입 시작 노드의 바운딩 박스 가져오기
                    const startNode = (node as any).prototypeStartNode;
                    
                    if (!startNode || !('absoluteBoundingBox' in startNode)) {
                        throw new Error("Invalid start node or node has no bounding box");
                    }
                    
                    const boundingBox = startNode.absoluteBoundingBox;
                    
                    ws.send({
                        type: 'INIT',
                        payload: {
                            url: msg.url,
                            password: msg.password,
                            nodeId: figmaNodeId,
                            width: boundingBox.width,
                            height: boundingBox.height
                        }
                    });
                } catch (error) {
                    console.error('Error:', error);
                    figma.notify('Error: ' + (error as Error).message, { error: true });
                }
                break;

            case 'request-screenshot':
                ws.send({
                    type: 'GET_SCREENSHOT',
                    payload: {
                        prefix: "1_before"
                    }
                });
                break;
        }
    } catch (error) {
        console.error('Error:', error);
        figma.notify('Error: ' + (error as Error).message, { error: true });
    }
};

figma.on('close', () => {
    ws.close();
});
