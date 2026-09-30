import { useEffect, useState, useCallback } from 'react';
import { socketService, type WebSocketEventType, type WebSocketMessage } from '../api/socketService';
import { useAuthStore } from '../stores/authStore';

/**
 * Hook to manage WebSocket connection lifecycle and event subscriptions.
 */
export function useWebSocket() {
	const { token, isAuthenticated } = useAuthStore();
	const [connected, setConnected] = useState(socketService.isConnected());

	useEffect(() => {
		if (isAuthenticated && token) {
			socketService.connect(token);
		} else {
			socketService.disconnect();
		}

		const unsubscribe = socketService.subscribe((msg) => {
			if (msg.event === 'WS_CONNECTED') {
				setConnected(true);
			} else if (msg.event === 'WS_DISCONNECTED') {
				setConnected(false);
			}
		});

		return () => {
			unsubscribe();
		};
	}, [isAuthenticated, token]);

	const onEvent = useCallback((event: WebSocketEventType, callback: (data?: any) => void) => {
		return socketService.on(event, callback);
	}, []);

	const subscribe = useCallback((listener: (msg: WebSocketMessage) => void) => {
		return socketService.subscribe(listener);
	}, []);

	return {
		connected,
		onEvent,
		subscribe,
		reconnect: () => socketService.connect(),
		disconnect: () => socketService.disconnect(),
	};
}
