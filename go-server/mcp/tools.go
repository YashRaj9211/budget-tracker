package mcp

import (
	"context"
	"encoding/json"
	"splitwise-go/database"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func RegisterTools(s *server.MCPServer) {
	// 1. search_friends
	searchFriendsTool := mcp.NewTool("search_friends", 
		mcp.WithDescription("Search for friends of the requesting user to find their exact User ID."),
		mcp.WithString("requesting_user_id", mcp.Required(), mcp.Description("The ID of the user making the request.")),
		mcp.WithString("query", mcp.Required(), mcp.Description("The name or username to search for.")),
	)
	s.AddTool(searchFriendsTool, handleSearchFriends)

	// 2. get_user_groups
	getUserGroupsTool := mcp.NewTool("get_user_groups",
		mcp.WithDescription("Get the list of groups the requesting user belongs to."),
		mcp.WithString("requesting_user_id", mcp.Required(), mcp.Description("The ID of the user making the request.")),
	)
	s.AddTool(getUserGroupsTool, handleGetUserGroups)
}

func handleSearchFriends(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args, ok := request.Params.Arguments.(map[string]interface{})
	if !ok {
		return mcp.NewToolResultError("arguments must be a map"), nil
	}
	reqUserId, ok := args["requesting_user_id"].(string)
	if !ok {
		return mcp.NewToolResultError("requesting_user_id requires a string"), nil
	}
	query, ok := args["query"].(string)
	if !ok {
		return mcp.NewToolResultError("query requires a string"), nil
	}

	var results []struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Username string `json:"username"`
	}

	likeQuery := "%" + query + "%"
	// Find friends where status is ACCEPTED
	database.DB.Raw(`
		SELECT u.id, u.name, u.username FROM friendships f
		JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
		WHERE (f.user_id = ? OR f.friend_id = ?) 
		AND f.status = 'ACCEPTED'
		AND (u.name ILIKE ? OR u.username ILIKE ?)
	`, reqUserId, reqUserId, reqUserId, likeQuery, likeQuery).Scan(&results)

	jsonBytes, _ := json.Marshal(results)
	return mcp.NewToolResultText(string(jsonBytes)), nil
}

func handleGetUserGroups(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args, ok := request.Params.Arguments.(map[string]interface{})
	if !ok {
		return mcp.NewToolResultError("arguments must be a map"), nil
	}
	reqUserId, ok := args["requesting_user_id"].(string)
	if !ok {
		return mcp.NewToolResultError("requesting_user_id requires a string"), nil
	}

	var groups []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}

	database.DB.Raw(`
		SELECT g.id, g.name FROM group_members gm
		JOIN groups g ON g.id = gm.group_id
		WHERE gm.user_id = ?
	`, reqUserId).Scan(&groups)

	jsonBytes, _ := json.Marshal(groups)
	return mcp.NewToolResultText(string(jsonBytes)), nil
}
