export class WebSocketClient {
    // WebSocket status constants
    private static readonly CLOSED = 3;
    private static instance: WebSocketClient;
    private ws: WebSocket | null = null;
    private listeners: ((response: any) => void)[] = [];

    private constructor() {}

    public static getInstance(): WebSocketClient {
        if (!WebSocketClient.instance) {
            WebSocketClient.instance = new WebSocketClient();
        }
        return WebSocketClient.instance;
    }

    get readyState(): number {
        return this.ws?.readyState ?? WebSocketClient.CLOSED;
    }

    send(data: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket is not open');
        }
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

    public onMessage(callback: (response: any) => void) {
        this.addListener(callback);
        return () => this.removeListener(callback);
    }

    // handle WebSocket response from UI
    public handleUIMessage(response: any) {
        this.listeners.forEach(listener => listener(response));
    }
}