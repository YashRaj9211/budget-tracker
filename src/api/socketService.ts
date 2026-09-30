import { API_BASE_URL } from './client';

export type WebSocketEventType =
	| 'REFETCH_EXPENSES'
	| 'FRIEND_REQUEST_RECEIVED'
	| 'FRIEND_REQUEST_ACCEPTED'
	| 'FRIEND_REQUEST_REJECTED'
	| string;

export interface WebSocketMessage {
	event: WebSocketEventType;
	data?: any;
}

export type WebSocketListener = (message: WebSocketMessage) => void;

class WebSocketClient {
	private ws: WebSocket | null = null;
	private listeners: Set<WebSocketListener> = new Set();
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 10;
	private reconnectTimeout: any = null;
	private isIntentionallyClosed = false;

	public connect(token?: string) {
		const authToken = token || localStorage.getItem('auth_token');
		if (!authToken) {
			return;
		}

		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
			return;
		}

		this.isIntentionallyClosed = false;

		// Use VITE_WS_URL if explicitly provided, otherwise convert http(s) API_BASE_URL to ws(s)
		const wsBaseUrl =
			import.meta.env.VITE_WS_URL ||
			API_BASE_URL.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
		const url = `${wsBaseUrl}/api/_private/v1/ws?token=${encodeURIComponent(authToken)}`;

		try {
			this.ws = new WebSocket(url);

			this.ws.onopen = () => {
				this.reconnectAttempts = 0;
				// Dispatch connection event
				this.notifyListeners({ event: 'WS_CONNECTED' });
			};

			this.ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					this.notifyListeners(data);
				} catch {
					this.notifyListeners({ event: 'RAW_MESSAGE', data: event.data });
				}
			};

			this.ws.onerror = () => {
				// handled by onclose
			};

			this.ws.onclose = () => {
				this.ws = null;
				this.notifyListeners({ event: 'WS_DISCONNECTED' });

				if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
					const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
					this.reconnectAttempts++;
					this.reconnectTimeout = setTimeout(() => {
						this.connect();
					}, delay);
				}
			};
		} catch (err) {
			console.error('Failed to create WebSocket connection:', err);
		}
	}

	public disconnect() {
		this.isIntentionallyClosed = true;
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	public subscribe(listener: WebSocketListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	public on(event: WebSocketEventType, callback: (data?: any) => void): () => void {
		const listener: WebSocketListener = (msg) => {
			if (msg.event === event) {
				callback(msg.data);
			}
		};
		return this.subscribe(listener);
	}

	private notifyListeners(message: WebSocketMessage) {
		this.listeners.forEach((listener) => {
			try {
				listener(message);
			} catch (err) {
				console.error('Error in WebSocket listener:', err);
			}
		});
	}

	public isConnected(): boolean {
		return !!this.ws && this.ws.readyState === WebSocket.OPEN;
	}
}

export const socketService = new WebSocketClient();
