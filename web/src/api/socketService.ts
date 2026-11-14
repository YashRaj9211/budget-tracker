import { API_BASE_URL } from './client';

export type KnownWebSocketEventType =
	| 'REFETCH_EXPENSES'
	| 'FRIEND_REQUEST_RECEIVED'
	| 'FRIEND_REQUEST_ACCEPTED'
	| 'FRIEND_REQUEST_REJECTED'
	| 'WS_CONNECTED'
	| 'WS_DISCONNECTED'
	| 'RAW_MESSAGE';

export type WebSocketEventType = KnownWebSocketEventType | (string & {});

export interface WebSocketEventMap {
	REFETCH_EXPENSES: undefined;
	FRIEND_REQUEST_RECEIVED: undefined;
	FRIEND_REQUEST_ACCEPTED: undefined;
	FRIEND_REQUEST_REJECTED: undefined;
	WS_CONNECTED: undefined;
	WS_DISCONNECTED: undefined;
	RAW_MESSAGE: string;
	[key: string]: unknown;
}

export interface WebSocketMessage<T = unknown> {
	event: WebSocketEventType;
	data?: T;
}

export type WebSocketListener<T = unknown> = (message: WebSocketMessage<T>) => void;

class WebSocketClient {
	private ws: WebSocket | null = null;
	private listeners: Set<WebSocketListener<unknown>> = new Set();
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 10;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
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

			this.ws.onmessage = (event: MessageEvent<string>) => {
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

	public subscribe<T = unknown>(listener: WebSocketListener<T>): () => void {
		this.listeners.add(listener as WebSocketListener<unknown>);
		return () => {
			this.listeners.delete(listener as WebSocketListener<unknown>);
		};
	}

	public on<K extends keyof WebSocketEventMap>(
		event: K,
		callback: (data?: WebSocketEventMap[K]) => void
	): () => void;
	public on<T = unknown>(
		event: string,
		callback: (data?: T) => void
	): () => void;
	public on(event: string, callback: (data?: unknown) => void): () => void {
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
