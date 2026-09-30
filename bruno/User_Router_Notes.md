# User Router Status & Architecture Notes

## Overview
In [user_router.go](file:///d:/Codes/budget-tracker/go-server/router/user_router.go):
```go
func UserRouter(r *gin.RouterGroup) {
	// Legacy /users/friends/:userId route removed.
	// Use /friends (auth-based) from FriendshipRouter instead.
	_ = r
}
```

The legacy route `GET /api/_private/v1/users/friends/:userId` was migrated and replaced by auth-based token context endpoints in [friendhip_router.go](file:///d:/Codes/budget-tracker/go-server/router/friendhip_router.go):
- **`GET /api/_private/v1/friends`**: Handled by `handlers.GetFriends` (already created in [bruno/Friendships/Get Accepted Friends.bru](file:///d:/Codes/budget-tracker/bruno/Friendships/Get%20Accepted%20Friends.bru)).
- **`GET /api/_private/v1/friendships`**: Handled by `handlers.GetFriendships` (already created in [bruno/Friendships/Get All Friendships.bru](file:///d:/Codes/budget-tracker/bruno/Friendships/Get%20All%20Friendships.bru)).

---

## Future Financial Hub Extensions for User Router
As we expand this project into a full finance hub, recommended endpoints to implement under `UserRouter`:
1. `GET /api/_private/v1/users/me`: Fetch full current user profile, currency preferences, default split ratios.
2. `PUT /api/_private/v1/users/me`: Update display name, phone, avatar, default currency (`INR`, `USD`, `EUR`).
3. `GET /api/_private/v1/users/search?q=`: Autocomplete user search by email or username to add friends or invite into groups.
