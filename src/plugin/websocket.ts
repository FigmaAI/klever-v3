import { WSMessage, WSMessageType, TestConfig, ServerResponse } from '../typings/types';

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number = 5;
    private readonly reconnectDelay: number = 1000;
    private testConfig: Partial<TestConfig> = {};

    constructor(private readonly url: string) {
        this.connect();
    }

    private connect() {
        try {
            this.ws = new WebSocket(this.url);
            this.setupEventListeners();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleReconnect();
        }
    }

    private setupEventListeners() {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('Connected to KleverDesktop');
            this.reconnectAttempts = 0;
            // 연결 성공 시 초기화 메시지 전송
            this.send({
                type: WSMessageType.INIT,
                payload: { status: 'connected' }
            });
        };

        this.ws.onclose = () => {
            console.log('Disconnected from KleverDesktop');
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            figma.notify('Connection error', { error: true });
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WSMessage;
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    }

    private handleMessage(message: WSMessage) {
        switch (message.type) {
            case WSMessageType.SCREENSHOT:
                figma.ui.postMessage({
                    type: WSMessageType.SCREENSHOT,
                    payload: message.payload
                });
                break;

            case WSMessageType.STATUS_UPDATE:
                figma.ui.postMessage({
                    type: WSMessageType.STATUS_UPDATE,
                    payload: message.payload
                });
                break;

            case WSMessageType.TEST_COMPLETE:
                figma.ui.postMessage({
                    type: WSMessageType.TEST_COMPLETE,
                    payload: message.payload
                });
                break;

            case WSMessageType.ERROR:
                figma.notify(message.payload.message || 'An error occurred', { error: true });
                figma.ui.postMessage({
                    type: WSMessageType.ERROR,
                    payload: message.payload
                });
                break;
        }
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
            figma.notify('Failed to connect to KleverDesktop', { error: true });
        }
    }

    // Step 1: URL 설정
    public setInitialConfig(url: string, password?: string) {
        this.testConfig = { url, password };
    }

    // Step 2: 테스트 시작
    public startTest(taskDesc: string, personaDesc?: string) {
        if (!this.testConfig.url) {
            throw new Error('URL is not set. Please complete Step 1 first.');
        }

        const config: TestConfig = {
            ...this.testConfig as TestConfig,
            taskDesc,
            personaDesc
        };

        this.send({
            type: WSMessageType.START_TEST,
            payload: config
        });
    }

    public stopTest() {
        this.send({ type: WSMessageType.STOP_TEST });
    }

    public getStatus() {
        this.send({ type: WSMessageType.GET_STATUS });
    }

    public send(message: WSMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
            throw new Error('WebSocket is not connected');
        }
    }

    public close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public reconnect() {
        this.close();
        this.connect();
    }
}