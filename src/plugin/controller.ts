import { WebSocketClient } from './websocket';
import { PluginMessage } from '../typings/types';

figma.showUI(__html__, { width: 480, height: 640 });

const ws = new WebSocketClient();

figma.ui.onmessage = async (msg: PluginMessage) => {
    try {
        switch (msg.type) {
            case 'init':
                ws.setInitialConfig(msg.url, msg.password);
                break;

            case 'explore':
                ws.startTest(msg.taskDesc, msg.personaDesc);
                break;

            case 'stop-exploration':
                ws.stopTest();
                break;

            case 'exploration-status':
                ws.getStatus();
                break;

            case 'error':
                console.error('Error:', msg.message);
                figma.notify(msg.message, { error: true });
                break;
        }
    } catch (error) {
        console.error('Error:', error);
        figma.notify('Error: ' + (error as Error).message, { error: true });
    }
};

// 플러그인이 닫힐 때 WebSocket 연결도 종료
figma.on('close', () => {
    ws.close();
});
