export class WebSocketClient {
    private static instance: WebSocketClient;
    private listeners: ((response: any) => void)[] = [];

    private constructor() {
        // UI와의 메시지 통신 설정
        figma.ui.onmessage = (event) => {
            if (event.type === 'websocket-message') {
                const response = event.data;
                this.listeners.forEach(listener => listener(response));
            }
        };
    }

    public static getInstance(): WebSocketClient {
        if (!WebSocketClient.instance) {
            WebSocketClient.instance = new WebSocketClient();
        }
        return WebSocketClient.instance;
    }

    public send(message: any) {
        // UI로 메시지 전송
        figma.ui.postMessage({
            type: 'websocket-send',
            data: message
        });
    }

    public addListener(callback: (response: any) => void) {
        this.listeners.push(callback);
    }

    public removeListener(callback: (response: any) => void) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    public close() {
        figma.ui.postMessage({
            type: 'websocket-close'
        });
    }
}