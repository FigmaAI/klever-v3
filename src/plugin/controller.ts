import { WebSocketClient } from './websocket';
import { WSMessageType, PluginMessage } from '../typings/types';

figma.showUI(__html__, { width: 480, height: 640 });

const ws = new WebSocketClient('ws://localhost:8080');

figma.ui.onmessage = async (msg: PluginMessage) => {
    try {
        switch (msg.type) {
            case 'init':
                // Step 1: URL 설정
                ws.setInitialConfig(msg.url, msg.password);
                figma.notify('Step 1 completed');
                break;

            case 'explore':
                // Step 2: 테스트 시작
                try {
                    await ws.startTest(msg.taskDesc, msg.personaDesc);
                } catch (error) {
                    figma.notify('Error: ' + (error as Error).message, { error: true });
                }
                break;

            case 'stop-exploration':
                ws.stopTest();
                break;

            case 'exploration-status':
                ws.getStatus();
                break;

            case 'reset':
                ws.close();
                ws.reconnect();
                break;
        }
    } catch (error) {
        console.error('Error in controller:', error);
        figma.notify('Error: ' + (error as Error).message, { error: true });
        
        // UI에 에러 상태 전달
        figma.ui.postMessage({
            type: WSMessageType.ERROR,
            payload: {
                message: (error as Error).message
            }
        });
    }
};

// 플러그인이 닫힐 때 WebSocket 연결도 종료
figma.on('close', () => {
    ws.close();
});
