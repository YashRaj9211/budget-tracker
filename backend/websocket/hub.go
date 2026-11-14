package websocket

import "sync"

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	sync.RWMutex
	// Registered clients mapped by userID string
	Clients map[string]map[*Client]bool
}

var AppHub = &Hub{
	Clients: make(map[string]map[*Client]bool),
}

func (h *Hub) Register(client *Client) {
	h.Lock()
	defer h.Unlock()
	if h.Clients[client.UserID] == nil {
		h.Clients[client.UserID] = make(map[*Client]bool)
	}
	h.Clients[client.UserID][client] = true
}

func (h *Hub) Unregister(client *Client) {
	h.Lock()
	defer h.Unlock()
	if clients, ok := h.Clients[client.UserID]; ok {
		if _, ok := clients[client]; ok {
			delete(clients, client)
			close(client.Send)
			if len(clients) == 0 {
				delete(h.Clients, client.UserID)
			}
		}
	}
}

func (h *Hub) BroadcastToUser(userID string, message []byte) {
	h.RLock()
	clients, ok := h.Clients[userID]
	if !ok {
		h.RUnlock()
		return
	}
	var slow []*Client
	for client := range clients {
		select {
		case client.Send <- message:
		default:
			slow = append(slow, client)
		}
	}
	h.RUnlock()

	// Clean up slow clients outside the read lock
	for _, c := range slow {
		h.Unregister(c)
	}
}

func (h *Hub) BroadcastToUsers(userIDs []string, message []byte) {
	for _, id := range userIDs {
		h.BroadcastToUser(id, message)
	}
}
