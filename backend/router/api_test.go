package router_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"splitwise-go/handlers"
	"splitwise-go/models"
	"splitwise-go/router"
	"splitwise-go/testutil"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type api struct {
	t      *testing.T
	engine *gin.Engine
	db     *gorm.DB
}

type user struct {
	ID    string
	Token string
}

func newAPI(t *testing.T) *api {
	t.Helper()
	db := testutil.NewDB(t, true)
	t.Setenv("JWT_SECRET", "test-secret")
	gin.SetMode(gin.TestMode)
	e := gin.New()
	router.DefaultRouter(&e.RouterGroup)
	return &api{t: t, engine: e, db: db}
}

// call sends a JSON request and returns the status and decoded body (map, slice or nil).
func (a *api) call(method, path, token string, body any) (int, any) {
	a.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			a.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, "/api/_private/v1"+path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("x-token", token)
	}
	w := httptest.NewRecorder()
	a.engine.ServeHTTP(w, req)
	var out any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func (a *api) signup(name string) user {
	a.t.Helper()
	pub := func(path string, body any) (int, map[string]any) {
		var buf bytes.Buffer
		_ = json.NewEncoder(&buf).Encode(body)
		req := httptest.NewRequest(http.MethodPost, "/api/_public/v1/users/"+path, &buf)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		a.engine.ServeHTTP(w, req)
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out
	}
	uid := fmt.Sprintf("%s_%d", name, time.Now().UnixNano())
	email := uid + "@example.com"
	if err := a.db.Create(&models.OTP{Email: email, Code: "123456", ExpiresAt: time.Now().Add(10 * time.Minute)}).Error; err != nil {
		a.t.Fatal(err)
	}
	if code, out := pub("signup", map[string]any{"email": email, "name": name, "username": uid, "password": "password123", "code": "123456"}); code != 200 {
		a.t.Fatalf("signup %s: %d %v", name, code, out)
	}
	code, out := pub("login", map[string]any{"email": email, "password": "password123"})
	if code != 200 {
		a.t.Fatalf("login %s: %d %v", name, code, out)
	}
	return user{ID: out["user"].(map[string]any)["id"].(string), Token: out["token"].(string)}
}

func (a *api) befriend(x, y user) {
	a.t.Helper()
	if err := a.db.Create(&models.Friendship{UserID: x.ID, FriendID: y.ID, Status: "ACCEPTED"}).Error; err != nil {
		a.t.Fatal(err)
	}
}

func (a *api) expect(label string, want, got int) {
	a.t.Helper()
	if want != got {
		a.t.Errorf("%s: want HTTP %d, got %d", label, want, got)
	}
}

func asMap(v any) map[string]any { m, _ := v.(map[string]any); return m }
func asList(v any) []any         { l, _ := v.([]any); return l }

func split(userID, amount string) map[string]any {
	return map[string]any{"userId": userID, "amount": amount, "splitType": "EQUAL"}
}

func TestAuthentication(t *testing.T) {
	a := newAPI(t)
	for _, p := range []string{"/expenses", "/groups", "/dashboard", "/split/overview", "/friends", "/categories"} {
		code, _ := a.call("GET", p, "", nil)
		a.expect("no token "+p, 401, code)
	}
	alice := a.signup("alice")
	code, _ := a.call("GET", "/expenses/user/"+alice.ID, alice.Token, nil)
	a.expect("removed /expenses/user/:id route", 404, code)

	// "Authorization: Bearer <token>" must work too (Bruno / Swagger use it)
	req := httptest.NewRequest("GET", "/api/_private/v1/expenses", nil)
	req.Header.Set("Authorization", "Bearer "+alice.Token)
	w := httptest.NewRecorder()
	a.engine.ServeHTTP(w, req)
	a.expect("bearer header", 200, w.Code)
}

func TestExpenseAuthorizationAndValidation(t *testing.T) {
	a := newAPI(t)
	alice, bob, carol := a.signup("alice"), a.signup("bob"), a.signup("carol")
	a.befriend(alice, bob) // carol is nobody's friend

	// Personal expenses are private.
	code, out := a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "500", "description": "secret", "type": "PERSONAL"})
	a.expect("create personal", 201, code)
	personalID := asMap(out)["id"].(string)
	_, list := a.call("GET", "/expenses", bob.Token, nil)
	if len(asList(list)) != 0 {
		t.Errorf("bob can see alice's expenses: %v", list)
	}
	code, _ = a.call("DELETE", "/expenses/"+personalID, bob.Token, nil)
	a.expect("bob deletes alice's personal expense", 403, code)
	code, _ = a.call("PUT", "/expenses/"+personalID, bob.Token, map[string]any{"amount": "1", "description": "x", "type": "PERSONAL"})
	a.expect("bob edits alice's personal expense", 403, code)

	// Validation.
	bad := []struct {
		name string
		body map[string]any
	}{
		{"negative amount", map[string]any{"amount": "-50", "description": "x", "type": "PERSONAL"}},
		{"zero amount", map[string]any{"amount": "0", "description": "x", "type": "PERSONAL"}},
		{"empty description", map[string]any{"amount": "5", "description": "  ", "type": "PERSONAL"}},
		{"unknown type", map[string]any{"amount": "5", "description": "x", "type": "GIFT"}},
		{"huge amount", map[string]any{"amount": "99999999999999", "description": "x", "type": "PERSONAL"}},
		{"split without splits", map[string]any{"amount": "100", "description": "x", "type": "SPLIT"}},
		{"splits do not add up", map[string]any{"amount": "100", "description": "x", "type": "SPLIT", "splits": []any{split(bob.ID, "10")}}},
		{"duplicate split users", map[string]any{"amount": "100", "description": "x", "type": "SPLIT", "splits": []any{split(bob.ID, "50"), split(bob.ID, "50")}}},
		{"negative split", map[string]any{"amount": "100", "description": "x", "type": "SPLIT", "splits": []any{split(bob.ID, "150"), split(alice.ID, "-50")}}},
		{"bad split type", map[string]any{"amount": "100", "description": "x", "type": "SPLIT", "splits": []any{map[string]any{"userId": bob.ID, "amount": "100", "splitType": "MAGIC"}}}},
	}
	for _, tc := range bad {
		code, _ := a.call("POST", "/expenses", alice.Token, tc.body)
		a.expect(tc.name, 400, code)
	}

	// Splitting outside a group needs an accepted friendship.
	code, _ = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "5000", "description": "you owe me", "type": "SPLIT", "splits": []any{split(carol.ID, "5000")}})
	a.expect("charge a non-friend", 403, code)
	code, _ = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "100", "description": "dinner", "type": "SPLIT", "splits": []any{split(alice.ID, "50"), split(bob.ID, "50")}})
	a.expect("split with a friend", 201, code)

	// A payer other than the caller is not allowed outside a group for personal expenses.
	code, _ = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "10", "description": "x", "type": "PERSONAL", "userId": bob.ID})
	a.expect("impersonate payer outside group", 403, code)

	// A friend can be the payer outside a group for a SPLIT expense if both are involved.
	code, out = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "60", "description": "coffee paid by bob", "type": "SPLIT", "userId": bob.ID, "splits": []any{split(alice.ID, "30"), split(bob.ID, "30")}})
	a.expect("friend paid outside group", 201, code)
	if asMap(out)["userId"] != bob.ID {
		t.Errorf("expected payer to be bob, got %v", asMap(out)["userId"])
	}

	// Nested objects in the JSON must not create records.
	var usersBefore int64
	a.db.Model(&models.User{}).Count(&usersBefore)
	a.call("POST", "/expenses", alice.Token, map[string]any{
		"amount": "5", "description": "x", "type": "PERSONAL",
		"user": map[string]any{"id": "evil", "email": "evil@x.com", "name": "E", "username": "evil", "password": "x"},
	})
	var usersAfter int64
	a.db.Model(&models.User{}).Count(&usersAfter)
	if usersBefore != usersAfter {
		t.Errorf("a nested user object created a user (%d -> %d)", usersBefore, usersAfter)
	}

	// isSettlement only applies to SPLIT expenses.
	_, out = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "5", "description": "x", "type": "PERSONAL", "isSettlement": true})
	if asMap(out)["isSettlement"] != false {
		t.Errorf("PERSONAL expense kept isSettlement=true: %v", out)
	}
	_, out = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "20", "description": "Settlement: bob paid alice", "type": "SPLIT", "isSettlement": true, "splits": []any{split(alice.ID, "20")}})
	if asMap(out)["isSettlement"] != true {
		t.Errorf("settlement flag not stored: %v", out)
	}

	// Settling: only your own share.
	_, out = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "100", "description": "trip", "type": "SPLIT", "splits": []any{split(alice.ID, "50"), split(bob.ID, "50")}})
	var bobSplitID string
	for _, s := range asList(asMap(out)["splits"]) {
		if asMap(s)["userId"] == bob.ID {
			bobSplitID = asMap(s)["id"].(string)
		}
	}
	code, _ = a.call("PUT", "/expenses/settle/"+bobSplitID, alice.Token, nil)
	a.expect("alice settles bob's share", 404, code)
	code, _ = a.call("PUT", "/expenses/settle/"+bobSplitID, bob.Token, nil)
	a.expect("bob settles his own share", 200, code)
}

func TestGroupRules(t *testing.T) {
	a := newAPI(t)
	alice, bob, carol := a.signup("alice"), a.signup("bob"), a.signup("carol")
	a.befriend(alice, bob)

	code, _ := a.call("POST", "/groups", alice.Token, map[string]any{"name": "Trip", "description": "d", "simplifyDebts": false, "memberIds": []string{carol.ID}})
	a.expect("create group with a non-friend", 400, code)
	code, _ = a.call("POST", "/groups", alice.Token, map[string]any{"name": "Trip", "description": "d", "simplifyDebts": false, "memberIds": []string{"no-such-user"}})
	a.expect("create group with an unknown user", 400, code)
	var groupsAfterFailures int64
	a.db.Model(&models.Group{}).Count(&groupsAfterFailures)
	if groupsAfterFailures != 0 {
		t.Errorf("failed group creation left %d groups behind", groupsAfterFailures)
	}

	code, out := a.call("POST", "/groups", alice.Token, map[string]any{"name": "Trip", "description": "d", "simplifyDebts": false, "memberIds": []string{bob.ID}})
	a.expect("create group with a friend", 200, code)
	emptyDescCode, _ := a.call("POST", "/groups", alice.Token, map[string]any{"name": "Trip Empty Desc", "description": "", "simplifyDebts": false})
	a.expect("create group with empty description", 200, emptyDescCode)
	minimalCode, _ := a.call("POST", "/groups", alice.Token, map[string]any{"name": "Trip Minimal"})
	a.expect("create group with only name", 200, minimalCode)
	gid := asMap(out)["id"].(string)
	if n := len(asList(asMap(out)["members"])); n != 2 {
		t.Errorf("want 2 members, got %d", n)
	}

	// Outsider (carol) cannot read or write.
	for _, tc := range []struct{ method, path string }{
		{"GET", "/groups/" + gid}, {"GET", "/groups/" + gid + "/members"},
		{"PUT", "/groups/" + gid + "/toggle-simplify"}, {"DELETE", "/groups/" + gid},
		{"POST", "/groups/" + gid + "/members/" + carol.ID},
	} {
		code, _ := a.call(tc.method, tc.path, carol.Token, nil)
		a.expect("outsider "+tc.method+" "+tc.path, 403, code)
	}
	code, _ = a.call("POST", "/expenses", carol.Token, map[string]any{"amount": "90", "description": "spam", "type": "SPLIT", "groupId": gid, "splits": []any{split(carol.ID, "90")}})
	a.expect("outsider creates expense in group", 403, code)

	// Members can record expenses, but only with other members.
	code, _ = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "100", "description": "x", "type": "SPLIT", "groupId": gid, "splits": []any{split(alice.ID, "50"), split(carol.ID, "50")}})
	a.expect("charge a non-member inside group", 400, code)
	code, out = a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "100", "description": "hotel", "type": "SPLIT", "groupId": gid, "userId": bob.ID, "splits": []any{split(alice.ID, "50"), split(bob.ID, "50")}})
	a.expect("bob recorded as payer by alice", 201, code)
	expID := asMap(out)["id"].(string)
	if asMap(out)["userId"] != bob.ID {
		t.Errorf("payer should be bob, got %v", asMap(out)["userId"])
	}

	// Alice records an expense in group paid by Bob with NO splits
	code, out = a.call("POST", "/expenses", alice.Token, map[string]any{
		"amount":      "45",
		"description": "snacks for group (no splits)",
		"type":        "SPLIT",
		"groupId":     gid,
		"userId":      bob.ID,
		"splits":      []any{},
	})
	a.expect("group expense with no splits paid by bob", 201, code)
	if len(asList(asMap(out)["splits"])) != 0 {
		t.Errorf("expected 0 splits, got %v", asMap(out)["splits"])
	}

	code, _ = a.call("DELETE", "/expenses/"+expID, carol.Token, nil)
	a.expect("outsider deletes group expense", 403, code)

	// Overview returns groups + expenses in one response, only for members.
	_, out = a.call("GET", "/split/overview", bob.Token, nil)
	if len(asList(asMap(out)["groups"])) != 1 || len(asList(asMap(out)["expenses"])) != 2 {
		t.Errorf("bob's overview wrong: %v", out)
	}
	_, out = a.call("GET", "/split/overview", carol.Token, nil)
	if len(asList(asMap(out)["groups"])) != 0 || len(asList(asMap(out)["expenses"])) != 0 {
		t.Errorf("carol's overview should be empty: %v", out)
	}

	// Adding members: friends only; no duplicates.
	code, _ = a.call("POST", "/groups/"+gid+"/members/"+carol.ID, alice.Token, nil)
	a.expect("add a non-friend", 403, code)
	code, _ = a.call("POST", "/groups/"+gid+"/members/"+bob.ID, alice.Token, nil)
	a.expect("add an existing member", 400, code)

	// Admin rules.
	code, _ = a.call("DELETE", "/groups/"+gid+"/members/"+alice.ID, alice.Token, nil)
	a.expect("remove the last admin", 400, code)
	code, _ = a.call("DELETE", "/groups/"+gid+"/members/"+alice.ID, bob.Token, nil)
	a.expect("non-admin removes someone", 403, code)
	code, _ = a.call("DELETE", "/groups/"+gid+"/leave", carol.Token, nil)
	a.expect("non-member leaves", 404, code)

	// Bob owes alice nothing net? hotel paid by bob, split 50/50 -> alice owes bob 50, so
	// alice must settle before leaving.
	code, _ = a.call("DELETE", "/groups/"+gid+"/leave", alice.Token, nil)
	a.expect("leave with unsettled debt", 400, code)
	code, _ = a.call("DELETE", "/expenses/"+expID, bob.Token, nil)
	a.expect("bob deletes the group expense", 200, code)

	// Last admin leaves: bob is promoted automatically.
	code, _ = a.call("DELETE", "/groups/"+gid+"/leave", alice.Token, nil)
	a.expect("last admin leaves", 200, code)
	var bobMember models.GroupMember
	if err := a.db.Where("group_id = ? AND user_id = ?", gid, bob.ID).First(&bobMember).Error; err != nil {
		t.Fatal(err)
	}
	if bobMember.Role != "ADMIN" {
		t.Errorf("bob should have been promoted to ADMIN, is %q", bobMember.Role)
	}
	code, _ = a.call("DELETE", "/groups/"+gid, bob.Token, nil)
	a.expect("new admin deletes group", 200, code)
	_ = fmt.Sprint()
}

func TestAnalytics(t *testing.T) {
	a := newAPI(t)
	alice, bob, carol := a.signup("alice"), a.signup("bob"), a.signup("carol")
	a.befriend(alice, bob)

	code, _ := a.call("GET", "/dashboard/analytics?months=13", alice.Token, nil)
	a.expect("months too large", 400, code)
	code, _ = a.call("GET", "/dashboard/analytics", "", nil)
	a.expect("analytics without token", 401, code)

	// alice: personal 100 (Food), income 1000, split 200 with bob (100 each), settlement 50 (ignored)
	a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "100", "description": "lunch", "type": "PERSONAL", "categoryId": "cat_food"})
	a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "1000", "description": "pay", "type": "INCOME"})
	a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "200", "description": "dinner", "type": "SPLIT", "categoryId": "cat_food", "splits": []any{split(alice.ID, "100"), split(bob.ID, "100")}})
	a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "50", "description": "Settlement", "type": "SPLIT", "isSettlement": true, "splits": []any{split(bob.ID, "50")}})

	_, out := a.call("GET", "/dashboard/analytics?months=3", alice.Token, nil)
	trend := asList(asMap(out)["trend"])
	if len(trend) != 3 {
		t.Fatalf("want 3 months, got %d: %v", len(trend), out)
	}
	cur := asMap(trend[2])
	want := map[string]float64{"personal": 100, "shared": 100, "lent": 100, "income": 1000, "spent": 200}
	for k, v := range want {
		if cur[k] != v {
			t.Errorf("alice %s: want %v, got %v", k, v, cur[k])
		}
	}
	if asMap(trend[0])["spent"] != float64(0) {
		t.Errorf("an empty month should be 0, got %v", asMap(trend[0])["spent"])
	}
	cats := asList(asMap(out)["categories"])
	if len(cats) != 1 || asMap(cats[0])["name"] != "Food" || asMap(cats[0])["amount"] != float64(200) {
		t.Errorf("category totals wrong: %v", cats)
	}

	// group spending: alice's share vs the group's total
	_, g := a.call("POST", "/groups", alice.Token, map[string]any{"name": "Trip", "description": "d", "simplifyDebts": false, "memberIds": []string{bob.ID}})
	code, gout := a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "80", "description": "taxi", "type": "SPLIT", "groupId": asMap(g)["id"], "splits": []any{split(alice.ID, "30"), split(bob.ID, "50")}})
	a.expect("group expense", 201, code)
	_ = gout
	_, out = a.call("GET", "/dashboard/analytics?months=3", alice.Token, nil)
	grp := asList(asMap(out)["groups"])
	if len(grp) != 1 || asMap(grp[0])["amount"] != float64(30) || asMap(grp[0])["total"] != float64(80) {
		t.Errorf("group stats wrong: %v", grp)
	}

	// bob only sees his own numbers: his share (100), nothing he paid.
	_, out = a.call("GET", "/dashboard/analytics?months=1", bob.Token, nil)
	bobNow := asMap(asList(asMap(out)["trend"])[0])
	if bobNow["spent"] != float64(150) || bobNow["personal"] != float64(0) || bobNow["lent"] != float64(0) {
		t.Errorf("bob numbers wrong: %v", bobNow)
	}

	// carol has nothing.
	_, out = a.call("GET", "/dashboard/analytics", carol.Token, nil)
	if asMap(asList(asMap(out)["trend"])[5])["spent"] != float64(0) || len(asList(asMap(out)["categories"])) != 0 {
		t.Errorf("carol should see empty analytics: %v", out)
	}
}

func TestCategoriesList(t *testing.T) {
	a := newAPI(t)
	alice := a.signup("alice")
	code, out := a.call("GET", "/categories", alice.Token, nil)
	a.expect("list categories", 200, code)
	list := asList(out)
	if len(list) < 2 {
		t.Fatalf("expected seeded categories, got %v", out)
	}
	// Verify sorted alphabetically
	for i := 1; i < len(list); i++ {
		prev := asMap(list[i-1])["name"].(string)
		curr := asMap(list[i])["name"].(string)
		if prev > curr {
			t.Errorf("categories not sorted: %s before %s", prev, curr)
		}
	}
}

func TestGroupCreationComprehensive(t *testing.T) {
	a := newAPI(t)
	alice, bob, charlie, dave := a.signup("alice"), a.signup("bob"), a.signup("charlie"), a.signup("dave")
	a.befriend(alice, bob)
	a.befriend(alice, charlie)
	// dave is NOT alice's friend

	// 1. Rejects missing / empty name
	code, _ := a.call("POST", "/groups", alice.Token, map[string]any{"name": ""})
	a.expect("empty name", 400, code)
	code, _ = a.call("POST", "/groups", alice.Token, map[string]any{"name": "   "})
	a.expect("whitespace name", 400, code)

	// 2. Rejects adding a non-friend as member
	code, _ = a.call("POST", "/groups", alice.Token, map[string]any{
		"name": "Weekend Goa Trip",
		"memberIds": []string{dave.ID},
	})
	a.expect("add non-friend on creation", 400, code)

	// 3. Rejects adding non-existent user ID
	code, _ = a.call("POST", "/groups", alice.Token, map[string]any{
		"name": "Ghost Trip",
		"memberIds": []string{"fake-user-id-999"},
	})
	a.expect("add ghost user on creation", 400, code)

	// 4. Successfully creates group with only name (defaults tested)
	code, out := a.call("POST", "/groups", alice.Token, map[string]any{
		"name": "Solo Hackathon",
	})
	a.expect("minimal group creation", 200, code)
	soloGroup := asMap(out)
	if soloGroup["name"] != "Solo Hackathon" {
		t.Errorf("expected name 'Solo Hackathon', got %v", soloGroup["name"])
	}
	if soloGroup["simplifyDebts"] != false {
		t.Errorf("expected simplifyDebts false, got %v", soloGroup["simplifyDebts"])
	}
	members := asList(soloGroup["members"])
	if len(members) != 1 {
		t.Fatalf("expected exactly 1 member (creator), got %d", len(members))
	}
	creatorMember := asMap(members[0])
	if creatorMember["userId"] != alice.ID || creatorMember["role"] != "ADMIN" {
		t.Errorf("creator member mismatch: %v", creatorMember)
	}

	// 5. Successfully creates group with description, simplifyDebts=true, and multiple friends
	code, out = a.call("POST", "/groups", alice.Token, map[string]any{
		"name": "Flat 302 Roommates",
		"description": "Monthly rent, utilities, and groceries",
		"simplifyDebts": true,
		"memberIds": []string{bob.ID, charlie.ID, alice.ID}, // includes alice to test deduplication
	})
	a.expect("group with friends and config", 200, code)
	flatGroup := asMap(out)
	flatGid := flatGroup["id"].(string)
	if flatGroup["simplifyDebts"] != true {
		t.Errorf("expected simplifyDebts true, got %v", flatGroup["simplifyDebts"])
	}
	flatMembers := asList(flatGroup["members"])
	if len(flatMembers) != 3 {
		t.Fatalf("expected 3 members (alice, bob, charlie), got %d", len(flatMembers))
	}

	// Verify roles: alice is ADMIN, bob and charlie are MEMBER
	roleMap := make(map[string]string)
	for _, m := range flatMembers {
		mMap := asMap(m)
		roleMap[mMap["userId"].(string)] = mMap["role"].(string)
		// Verify user profile is preloaded
		userObj := asMap(mMap["user"])
		if userObj == nil || userObj["id"] == nil {
			t.Errorf("expected member user profile to be loaded, got %v", mMap)
		}
	}
	if roleMap[alice.ID] != "ADMIN" {
		t.Errorf("expected alice to be ADMIN, got %s", roleMap[alice.ID])
	}
	if roleMap[bob.ID] != "MEMBER" || roleMap[charlie.ID] != "MEMBER" {
		t.Errorf("expected friends to be MEMBER, got %v", roleMap)
	}

	// 6. Verify retrievable via GET /groups
	code, out = a.call("GET", "/groups", alice.Token, nil)
	a.expect("list user groups", 200, code)
	userGroups := asList(asMap(out)["groups"])
	if len(userGroups) < 2 {
		t.Errorf("expected at least 2 groups for alice, got %d", len(userGroups))
	}

	// 7. Verify retrievable via GET /groups/:groupId
	code, out = a.call("GET", "/groups/"+flatGid, bob.Token, nil)
	a.expect("get group by id", 200, code)

	// 8. Verify split overview contains group
	code, out = a.call("GET", "/split/overview", charlie.Token, nil)
	a.expect("split overview contains group", 200, code)
	overviewGroups := asList(asMap(out)["groups"])
	foundFlat := false
	for _, og := range overviewGroups {
		if asMap(og)["id"] == flatGid {
			foundFlat = true
			break
		}
	}
	if !foundFlat {
		t.Errorf("charlie's overview missing group %s", flatGid)
	}
}

func TestExpenseIncludeInBudget(t *testing.T) {
	a := newAPI(t)
	alice := a.signup("alice")

	// 1. Create personal expense without the field -> stored as true, returned as true
	code, out := a.call("POST", "/expenses", alice.Token, map[string]any{
		"amount":      "100",
		"description": "lunch default",
		"type":        "PERSONAL",
	})
	a.expect("create personal without includeInBudget", 201, code)
	exp1 := asMap(out)
	if exp1["includeInBudget"] != true {
		t.Errorf("expected includeInBudget=true when omitted, got %v", exp1["includeInBudget"])
	}
	id1 := exp1["id"].(string)

	var dbExp1 models.Expense
	if err := a.db.First(&dbExp1, "id = ?", id1).Error; err != nil {
		t.Fatalf("load db expense 1: %v", err)
	}
	if dbExp1.IncludeInBudget == nil || !*dbExp1.IncludeInBudget {
		t.Errorf("db expense 1 should have include_in_budget=true, got %v", dbExp1.IncludeInBudget)
	}

	// 2. Create personal expense with includeInBudget: false -> stored as false, returned as false
	code, out = a.call("POST", "/expenses", alice.Token, map[string]any{
		"amount":          "250",
		"description":     "fancy dinner excluded",
		"type":            "PERSONAL",
		"includeInBudget": false,
	})
	a.expect("create personal with includeInBudget=false", 201, code)
	exp2 := asMap(out)
	if exp2["includeInBudget"] != false {
		t.Errorf("expected includeInBudget=false, got %v", exp2["includeInBudget"])
	}
	id2 := exp2["id"].(string)

	var dbExp2 models.Expense
	if err := a.db.First(&dbExp2, "id = ?", id2).Error; err != nil {
		t.Fatalf("load db expense 2: %v", err)
	}
	if dbExp2.IncludeInBudget == nil || *dbExp2.IncludeInBudget != false {
		t.Errorf("db expense 2 should have include_in_budget=false, got %v", dbExp2.IncludeInBudget)
	}

	// 3. Update personal expense: change from false to true
	code, out = a.call("PUT", "/expenses/"+id2, alice.Token, map[string]any{
		"amount":          "250",
		"description":     "fancy dinner now included",
		"type":            "PERSONAL",
		"includeInBudget": true,
	})
	a.expect("update personal with includeInBudget=true", 200, code)
	if asMap(out)["includeInBudget"] != true {
		t.Errorf("expected updated includeInBudget=true, got %v", asMap(out)["includeInBudget"])
	}

	// 4. Update personal expense: change from true to false
	code, out = a.call("PUT", "/expenses/"+id1, alice.Token, map[string]any{
		"amount":          "100",
		"description":     "lunch now excluded",
		"type":            "PERSONAL",
		"includeInBudget": false,
	})
	a.expect("update personal with includeInBudget=false", 200, code)
	if asMap(out)["includeInBudget"] != false {
		t.Errorf("expected updated includeInBudget=false, got %v", asMap(out)["includeInBudget"])
	}

	// 5. Update personal expense without includeInBudget field -> the stored value (false) is kept,
	// so an old client cannot silently re-include an excluded expense.
	code, out = a.call("PUT", "/expenses/"+id1, alice.Token, map[string]any{
		"amount":      "120",
		"description": "lunch updated by old client",
		"type":        "PERSONAL",
	})
	a.expect("update personal omitting includeInBudget", 200, code)
	if asMap(out)["includeInBudget"] != false {
		t.Errorf("expected includeInBudget=false kept after update without field, got %v", asMap(out)["includeInBudget"])
	}

	// 6. Income expense can also have includeInBudget: false
	code, out = a.call("POST", "/expenses", alice.Token, map[string]any{
		"amount":          "5000",
		"description":     "gift income",
		"type":            "INCOME",
		"includeInBudget": false,
	})
	a.expect("create income with includeInBudget=false", 201, code)
	if asMap(out)["includeInBudget"] != false {
		t.Errorf("expected income includeInBudget=false, got %v", asMap(out)["includeInBudget"])
	}

	// 7. SPLIT expense ignores includeInBudget: false and stays true
	bob := a.signup("bob")
	a.befriend(alice, bob)
	code, out = a.call("POST", "/expenses", alice.Token, map[string]any{
		"amount":          "100",
		"description":     "split dinner",
		"type":            "SPLIT",
		"includeInBudget": false,
		"splits":          []any{split(alice.ID, "50"), split(bob.ID, "50")},
	})
	a.expect("create split with includeInBudget=false", 201, code)
	if asMap(out)["includeInBudget"] != true {
		t.Errorf("split expense should ignore includeInBudget=false and be true, got %v", asMap(out)["includeInBudget"])
	}
}

func TestSalaryHistoryAndMonthlyRule(t *testing.T) {
	a := newAPI(t)
	alice, bob := a.signup("alice"), a.signup("bob")

	// 1. Auth required
	code, _ := a.call("GET", "/salary", "", nil)
	a.expect("no token get salary", 401, code)
	code, _ = a.call("POST", "/salary", "", map[string]any{"amount": "50000", "effectiveFrom": "2026-01-01"})
	a.expect("no token post salary", 401, code)

	// 2. Validation errors
	code, _ = a.call("POST", "/salary", alice.Token, map[string]any{"amount": "-100", "effectiveFrom": "2026-01-01"})
	a.expect("negative salary", 400, code)
	code, _ = a.call("POST", "/salary", alice.Token, map[string]any{"amount": "50000", "effectiveFrom": "not-a-date"})
	a.expect("invalid effectiveFrom", 400, code)

	// 3. Add salary 50 000 from 2026-01-01
	code, out := a.call("POST", "/salary", alice.Token, map[string]any{
		"amount":        "50000",
		"effectiveFrom": "2026-01-01",
		"note":          "Starting salary",
	})
	a.expect("create jan salary", 201, code)
	janEntry := asMap(out)
	janID := janEntry["id"].(string)

	// 4. Add salary 60 000 from 2026-07-01
	code, out = a.call("POST", "/salary", alice.Token, map[string]any{
		"amount":        "60000",
		"effectiveFrom": "2026-07-01",
		"note":          "Mid-year hike",
	})
	a.expect("create jul salary", 201, code)
	julEntry := asMap(out)
	julID := julEntry["id"].(string)

	// 5. GET /salary returns full history, newest first
	code, out = a.call("GET", "/salary", alice.Token, nil)
	a.expect("list salary history", 200, code)
	history := asList(out)
	if len(history) != 2 {
		t.Fatalf("expected 2 salary entries, got %d", len(history))
	}
	if asMap(history[0])["id"] != julID || asMap(history[1])["id"] != janID {
		t.Errorf("history should be ordered newest first, got: %v", history)
	}

	// 6. Test monthly rule (via GET /salary/active?month=YYYY-MM and handlers.GetSalaryForMonth)
	testCases := []struct {
		month string
		want  string
	}{
		{"2025-12", "0"},     // Before first entry -> 0
		{"2026-01", "50000"}, // Jan 2026 -> 50000
		{"2026-03", "50000"}, // Mar 2026 -> 50000
		{"2026-06", "50000"}, // Jun 2026 -> 50000
		{"2026-07", "60000"}, // Jul 2026 -> 60000
		{"2026-08", "60000"}, // Aug 2026 -> 60000
		{"2027-01", "60000"}, // Future -> latest entry (60000)
	}

	for _, tc := range testCases {
		code, out = a.call("GET", "/salary/active?month="+tc.month, alice.Token, nil)
		a.expect("active salary for "+tc.month, 200, code)
		gotAmount := fmt.Sprintf("%v", asMap(out)["amount"])
		if gotAmount != tc.want {
			t.Errorf("month %s: want %s, got %s", tc.month, tc.want, gotAmount)
		}

		amt, _, err := handlers.GetSalaryForMonth(a.db, alice.ID, tc.month)
		if err != nil {
			t.Fatalf("GetSalaryForMonth error: %v", err)
		}
		if amt.String() != tc.want {
			t.Errorf("GetSalaryForMonth for %s: want %s, got %s", tc.month, tc.want, amt.String())
		}
	}

	// 7. Bob cannot view or manipulate Alice's salary entries
	code, out = a.call("GET", "/salary", bob.Token, nil)
	a.expect("bob history", 200, code)
	if len(asList(out)) != 0 {
		t.Errorf("bob should have no salary history, got %v", out)
	}
	code, _ = a.call("PUT", "/salary/"+janID, bob.Token, map[string]any{"amount": "99999"})
	a.expect("bob update alice salary", 404, code)
	code, _ = a.call("DELETE", "/salary/"+janID, bob.Token, nil)
	a.expect("bob delete alice salary", 404, code)

	// 8. Update salary entry
	code, out = a.call("PUT", "/salary/"+janID, alice.Token, map[string]any{
		"amount": "52000",
		"note":   "Revised Jan salary",
	})
	a.expect("update jan salary", 200, code)
	if fmt.Sprintf("%v", asMap(out)["amount"]) != "52000" {
		t.Errorf("expected updated amount 52000, got %v", asMap(out)["amount"])
	}

	// Mar now reflects updated Jan salary (52000)
	code, out = a.call("GET", "/salary/active?month=2026-03", alice.Token, nil)
	if fmt.Sprintf("%v", asMap(out)["amount"]) != "52000" {
		t.Errorf("month 2026-03 after update: want 52000, got %v", asMap(out)["amount"])
	}

	// 9. Soft delete July entry
	code, _ = a.call("DELETE", "/salary/"+julID, alice.Token, nil)
	a.expect("delete jul salary", 200, code)

	// History should now have only Jan entry
	code, out = a.call("GET", "/salary", alice.Token, nil)
	if len(asList(out)) != 1 {
		t.Errorf("expected 1 entry after soft delete, got %d", len(asList(out)))
	}

	// Jul 2026 now falls back to Jan entry (52000)
	code, out = a.call("GET", "/salary/active?month=2026-07", alice.Token, nil)
	if fmt.Sprintf("%v", asMap(out)["amount"]) != "52000" {
		t.Errorf("month 2026-07 after deleting jul entry: want 52000, got %v", asMap(out)["amount"])
	}

	// Verify database record has deleted_at set (soft delete, not row deleted)
	var dbJul models.SalaryEntry
	if err := a.db.Unscoped().First(&dbJul, "id = ?", julID).Error; err != nil {
		t.Fatalf("jul entry should still exist in db unscoped: %v", err)
	}
	if dbJul.DeletedAt == nil {
		t.Errorf("expected dbJul.DeletedAt to be non-nil after soft delete")
	}
}

func TestSavingsAccountsAndTransactions(t *testing.T) {
	a := newAPI(t)
	alice := a.signup("AliceSav")
	bob := a.signup("BobSav")

	// 1. Unauthenticated requests should fail with 401
	code, _ := a.call("GET", "/savings-accounts", "", nil)
	a.expect("no token get savings accounts", 401, code)
	code, _ = a.call("POST", "/savings-accounts", "", map[string]any{"name": "Bank"})
	a.expect("no token post savings account", 401, code)
	code, _ = a.call("POST", "/savings-accounts/dummy/transactions", "", map[string]any{"amount": "100", "direction": "DEPOSIT", "txnDate": "2026-01-01"})
	a.expect("no token post savings txn", 401, code)

	// 2. Input validation on creating account
	code, _ = a.call("POST", "/savings-accounts", alice.Token, map[string]any{"name": "   "})
	a.expect("empty account name", 400, code)
	code, _ = a.call("POST", "/savings-accounts", alice.Token, map[string]any{"name": "Savings", "openingBalance": "-500"})
	a.expect("negative opening balance", 400, code)
	code, _ = a.call("POST", "/savings-accounts", alice.Token, map[string]any{"name": "Savings", "kind": "BITCOIN"})
	a.expect("invalid account kind", 400, code)

	// 3. Create Account 1 (opening balance 10 000)
	code, out := a.call("POST", "/savings-accounts", alice.Token, map[string]any{
		"name":           "Emergency Fund",
		"kind":           "BANK",
		"openingBalance": "10000.00",
		"currency":       "INR",
	})
	a.expect("create emergency fund", 201, code)
	acc1 := asMap(out)
	acc1ID := fmt.Sprintf("%v", acc1["id"])
	if fmt.Sprintf("%v", acc1["balance"]) != "10000" {
		t.Fatalf("expected initial balance 10000, got %v", acc1["balance"])
	}

	// 4. Create Account 2 (opening balance 50 000)
	code, out = a.call("POST", "/savings-accounts", alice.Token, map[string]any{
		"name":           "Index Fund",
		"kind":           "MUTUAL_FUND",
		"openingBalance": "50000.00",
	})
	a.expect("create index fund", 201, code)
	acc2 := asMap(out)
	acc2ID := fmt.Sprintf("%v", acc2["id"])

	// 5. Total savings across accounts initially: 10000 + 50000 = 60000
	total, err := handlers.GetTotalSavings(a.db, alice.ID)
	if err != nil {
		t.Fatalf("GetTotalSavings err: %v", err)
	}
	if total.String() != "60000" {
		t.Errorf("expected total savings 60000, got %s", total.String())
	}

	// 6. Validation on transaction creation
	code, _ = a.call("POST", "/savings-accounts/"+acc1ID+"/transactions", alice.Token, map[string]any{
		"amount":    "-100",
		"direction": "DEPOSIT",
		"txnDate":   "2026-05-01",
	})
	a.expect("negative txn amount", 400, code)
	code, _ = a.call("POST", "/savings-accounts/"+acc1ID+"/transactions", alice.Token, map[string]any{
		"amount":    "500",
		"direction": "TRANSFER",
		"txnDate":   "2026-05-01",
	})
	a.expect("invalid direction", 400, code)
	code, _ = a.call("POST", "/savings-accounts/"+acc1ID+"/transactions", alice.Token, map[string]any{
		"amount":    "500",
		"direction": "DEPOSIT",
		"txnDate":   "invalid-date",
	})
	a.expect("invalid date", 400, code)

	// 7. Add transactions to Account 1:
	// Deposit 5 000
	code, out = a.call("POST", "/savings-accounts/"+acc1ID+"/transactions", alice.Token, map[string]any{
		"amount":    "5000.00",
		"direction": "DEPOSIT",
		"txnDate":   "2026-05-05",
		"note":      "May saving",
	})
	a.expect("create deposit txn", 201, code)

	// Withdrawal 2 000
	code, out = a.call("POST", "/savings-accounts/"+acc1ID+"/transactions", alice.Token, map[string]any{
		"amount":    "2000.00",
		"direction": "WITHDRAWAL",
		"txnDate":   "2026-05-15",
		"note":      "Emergency medical",
	})
	a.expect("create withdrawal txn", 201, code)
	wTxnID := fmt.Sprintf("%v", asMap(out)["id"])

	// Check Account 1 balance: opening 10000 + deposit 5000 - withdrawal 2000 = 13000
	code, out = a.call("GET", "/savings-accounts/"+acc1ID, alice.Token, nil)
	a.expect("get account 1", 200, code)
	if fmt.Sprintf("%v", asMap(out)["balance"]) != "13000" {
		t.Fatalf("expected balance 13000, got %v", asMap(out)["balance"])
	}

	// 8. List transactions for Account 1
	code, out = a.call("GET", "/savings-accounts/"+acc1ID+"/transactions", alice.Token, nil)
	a.expect("list transactions", 200, code)
	txns := asList(out)
	if len(txns) != 2 {
		t.Fatalf("expected 2 transactions, got %d", len(txns))
	}

	// 9. Bob isolation checks
	code, _ = a.call("GET", "/savings-accounts/"+acc1ID, bob.Token, nil)
	a.expect("bob get alice account", 404, code)
	code, _ = a.call("PUT", "/savings-accounts/"+acc1ID, bob.Token, map[string]any{"name": "Hacked"})
	a.expect("bob put alice account", 404, code)
	code, _ = a.call("DELETE", "/savings-accounts/"+acc1ID, bob.Token, nil)
	a.expect("bob delete alice account", 404, code)
	code, _ = a.call("GET", "/savings-accounts/"+acc1ID+"/transactions", bob.Token, nil)
	a.expect("bob get alice txns", 404, code)
	code, _ = a.call("POST", "/savings-accounts/"+acc1ID+"/transactions", bob.Token, map[string]any{
		"amount":    "1000.00",
		"direction": "DEPOSIT",
		"txnDate":   "2026-05-20",
	})
	a.expect("bob post txn to alice account", 404, code)
	code, _ = a.call("DELETE", "/savings-accounts/"+acc1ID+"/transactions/"+wTxnID, bob.Token, nil)
	a.expect("bob delete alice txn", 404, code)

	// 10. Soft-delete the withdrawal transaction
	code, _ = a.call("DELETE", "/savings-accounts/"+acc1ID+"/transactions/"+wTxnID, alice.Token, nil)
	a.expect("delete withdrawal txn", 200, code)

	// Balance should now dynamically recalculate to 10000 + 5000 = 15000
	code, out = a.call("GET", "/savings-accounts/"+acc1ID, alice.Token, nil)
	a.expect("get account 1 after txn deletion", 200, code)
	if fmt.Sprintf("%v", asMap(out)["balance"]) != "15000" {
		t.Fatalf("expected balance 15000 after deleting withdrawal, got %v", asMap(out)["balance"])
	}

	// Verify withdrawal transaction row still exists with deleted_at set in DB
	var dbTxn models.SavingsTransaction
	if err := a.db.Unscoped().First(&dbTxn, "id = ?", wTxnID).Error; err != nil {
		t.Fatalf("transaction should exist in db unscoped: %v", err)
	}
	if dbTxn.DeletedAt == nil {
		t.Errorf("expected dbTxn.DeletedAt to be non-nil after soft delete")
	}

	// 11. Update Account 1 (update name and opening balance)
	code, out = a.call("PUT", "/savings-accounts/"+acc1ID, alice.Token, map[string]any{
		"name":           "Primary Emergency Fund",
		"openingBalance": "12000.00",
	})
	a.expect("update account 1", 200, code)
	if fmt.Sprintf("%v", asMap(out)["name"]) != "Primary Emergency Fund" {
		t.Errorf("expected updated name Primary Emergency Fund, got %v", asMap(out)["name"])
	}
	// Balance is now 12000 + 5000 = 17000
	if fmt.Sprintf("%v", asMap(out)["balance"]) != "17000" {
		t.Fatalf("expected balance 17000 after updating opening balance, got %v", asMap(out)["balance"])
	}

	// 12. Soft delete Account 1
	code, _ = a.call("DELETE", "/savings-accounts/"+acc1ID, alice.Token, nil)
	a.expect("delete account 1", 200, code)

	// Listing accounts should now only return Account 2
	code, out = a.call("GET", "/savings-accounts", alice.Token, nil)
	a.expect("list accounts after deleting account 1", 200, code)
	accList := asList(out)
	if len(accList) != 1 {
		t.Fatalf("expected 1 active account, got %d", len(accList))
	}
	if fmt.Sprintf("%v", asMap(accList[0])["id"]) != acc2ID {
		t.Errorf("expected active account to be acc2 (%s), got %v", acc2ID, asMap(accList[0])["id"])
	}

	// Total savings should now only reflect Account 2 (50 000)
	total, err = handlers.GetTotalSavings(a.db, alice.ID)
	if err != nil {
		t.Fatalf("GetTotalSavings err: %v", err)
	}
	if total.String() != "50000" {
		t.Errorf("expected total savings 50000 after account 1 deletion, got %s", total.String())
	}

	// Verify Account 1 and its remaining transactions are soft-deleted in DB
	var dbAcc models.SavingsAccount
	if err := a.db.Unscoped().First(&dbAcc, "id = ?", acc1ID).Error; err != nil {
		t.Fatalf("account should exist in db unscoped: %v", err)
	}
	if dbAcc.DeletedAt == nil {
		t.Errorf("expected dbAcc.DeletedAt to be non-nil after soft delete")
	}

	var activeTxnsCount int64
	a.db.Model(&models.SavingsTransaction{}).Where("account_id = ? AND deleted_at IS NULL", acc1ID).Count(&activeTxnsCount)
	if activeTxnsCount != 0 {
		t.Errorf("expected 0 active transactions for deleted account, got %d", activeTxnsCount)
	}
}

func TestFinanceSummary(t *testing.T) {
	a := newAPI(t)
	alice := a.signup("AliceFin")
	bob := a.signup("BobFin")

	// 1. Unauthenticated request -> 401
	code, _ := a.call("GET", "/finance-summary", "", nil)
	a.expect("no token get finance summary", 401, code)

	// 2. Invalid month format -> 400
	code, _ = a.call("GET", "/finance-summary?month=not-a-month", alice.Token, nil)
	a.expect("invalid month format", 400, code)
	code, _ = a.call("GET", "/finance-summary?month=2026-13", alice.Token, nil)
	a.expect("invalid month 13", 400, code)

	// 3. Setup Salary for Alice:
	// 50 000 from 2026-01-01
	// 60 000 from 2026-07-01
	code, _ = a.call("POST", "/salary", alice.Token, map[string]any{
		"amount":        "50000.00",
		"effectiveFrom": "2026-01-01",
		"note":          "Initial salary",
	})
	a.expect("create jan salary", 201, code)

	code, _ = a.call("POST", "/salary", alice.Token, map[string]any{
		"amount":        "60000.00",
		"effectiveFrom": "2026-07-01",
		"note":          "Raised salary",
	})
	a.expect("create jul salary", 201, code)

	// 4. Setup Savings Accounts for Alice:
	// Account 1: Emergency Fund (10 000 opening + 5 000 deposit - 2 000 withdrawal = 13 000)
	code, out := a.call("POST", "/savings-accounts", alice.Token, map[string]any{
		"name":           "Emergency Fund",
		"kind":           "BANK",
		"openingBalance": "10000.00",
	})
	a.expect("create acc1", 201, code)
	acc1ID := fmt.Sprintf("%v", asMap(out)["id"])

	code, _ = a.call("POST", "/savings-accounts/"+acc1ID+"/transactions", alice.Token, map[string]any{
		"amount":    "5000.00",
		"direction": "DEPOSIT",
		"txnDate":   "2026-05-05",
	})
	a.expect("deposit acc1", 201, code)

	code, _ = a.call("POST", "/savings-accounts/"+acc1ID+"/transactions", alice.Token, map[string]any{
		"amount":    "2000.00",
		"direction": "WITHDRAWAL",
		"txnDate":   "2026-05-15",
	})
	a.expect("withdraw acc1", 201, code)

	// Account 2: Stocks (25 000 opening = 25 000)
	code, _ = a.call("POST", "/savings-accounts", alice.Token, map[string]any{
		"name":           "Stocks Portfolio",
		"kind":           "MUTUAL_FUND",
		"openingBalance": "25000.00",
	})
	a.expect("create acc2", 201, code)

	// Account 3: Deleted account (100 000 opening, then soft-deleted)
	code, out = a.call("POST", "/savings-accounts", alice.Token, map[string]any{
		"name":           "Old Deleted Account",
		"openingBalance": "100000.00",
	})
	a.expect("create acc3", 201, code)
	acc3ID := fmt.Sprintf("%v", asMap(out)["id"])
	code, _ = a.call("DELETE", "/savings-accounts/"+acc3ID, alice.Token, nil)
	a.expect("delete acc3", 200, code)

	// Total active savings across accounts: 13 000 + 25 000 = 38 000

	// 5. Setup Expenses for Alice in May 2026 (2026-05):
	may1 := time.Date(2026, 5, 2, 12, 0, 0, 0, time.UTC)
	may5 := time.Date(2026, 5, 5, 12, 0, 0, 0, time.UTC)
	may10 := time.Date(2026, 5, 10, 12, 0, 0, 0, time.UTC)
	may12 := time.Date(2026, 5, 12, 12, 0, 0, 0, time.UTC)
	jun1 := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

	// A. Other Income in May: 15 000
	incMay := models.Expense{
		UserID:      alice.ID,
		Amount:      decimal.NewFromInt(15000),
		Description: "Freelance May",
		Type:        models.ExpenseTypeIncome,
		ExpenseDate: may10,
	}
	if err := a.db.Create(&incMay).Error; err != nil {
		t.Fatalf("create income expense: %v", err)
	}

	// B. Personal expense (included in budget explicitly): 4 000
	tTrue := true
	expB := models.Expense{
		UserID:          alice.ID,
		Amount:          decimal.NewFromInt(4000),
		Description:     "Groceries",
		Type:            models.ExpenseTypePersonal,
		IncludeInBudget: &tTrue,
		ExpenseDate:     may1,
	}
	if err := a.db.Create(&expB).Error; err != nil {
		t.Fatalf("create expB: %v", err)
	}

	// C. Personal expense (included in budget by default): 2 000
	expC := models.Expense{
		UserID:      alice.ID,
		Amount:      decimal.NewFromInt(2000),
		Description: "Electricity",
		Type:        models.ExpenseTypePersonal,
		ExpenseDate: may5,
	}
	if err := a.db.Create(&expC).Error; err != nil {
		t.Fatalf("create expC: %v", err)
	}

	// D. Personal expense (excluded from budget): 10 000
	tFalse := false
	expD := models.Expense{
		UserID:          alice.ID,
		Amount:          decimal.NewFromInt(10000),
		Description:     "Vacation flight",
		Type:            models.ExpenseTypePersonal,
		IncludeInBudget: &tFalse,
		ExpenseDate:     may12,
	}
	if err := a.db.Create(&expD).Error; err != nil {
		t.Fatalf("create expD: %v", err)
	}

	// E. Soft-deleted personal expense in May: 9 999 (should be ignored)
	deletedTime := time.Now()
	expDel := models.Expense{
		UserID:      alice.ID,
		Amount:      decimal.NewFromInt(9999),
		Description: "Cancelled item",
		Type:        models.ExpenseTypePersonal,
		ExpenseDate: may5,
		DeletedAt:   &deletedTime,
	}
	if err := a.db.Create(&expDel).Error; err != nil {
		t.Fatalf("create expDel: %v", err)
	}

	// F. Personal expense in June: 20 000 (should not count in May)
	expJun := models.Expense{
		UserID:      alice.ID,
		Amount:      decimal.NewFromInt(20000),
		Description: "June Rent",
		Type:        models.ExpenseTypePersonal,
		ExpenseDate: jun1,
	}
	if err := a.db.Create(&expJun).Error; err != nil {
		t.Fatalf("create expJun: %v", err)
	}

	// G. Group / Split expense in May: 3 000 (should not count in PERSONAL totalSpent)
	expSplit := models.Expense{
		UserID:      alice.ID,
		Amount:      decimal.NewFromInt(3000),
		Description: "Group Dinner",
		Type:        models.ExpenseTypeSplit,
		ExpenseDate: may5,
	}
	if err := a.db.Create(&expSplit).Error; err != nil {
		t.Fatalf("create expSplit: %v", err)
	}

	// 6. Test May 2026 Summary
	// Hand calculation:
	// salary: 50 000
	// otherIncome: 15 000
	// totalIncome: 50 000 + 15 000 = 65 000
	// totalSpent: 4 000 + 2 000 + 10 000 = 16 000
	// budgetSpent: 4 000 + 2 000 = 6 000
	// excludedSpent: 16 000 - 6 000 = 10 000
	// left: 65 000 - 16 000 = 49 000
	// savingsTotal: 38 000
	code, out = a.call("GET", "/finance-summary?month=2026-05", alice.Token, nil)
	a.expect("get may summary", 200, code)
	mOut := asMap(out)

	if fmt.Sprintf("%v", mOut["month"]) != "2026-05" {
		t.Errorf("month: want 2026-05, got %v", mOut["month"])
	}
	if fmt.Sprintf("%v", mOut["salary"]) != "50000" {
		t.Errorf("salary: want 50000, got %v", mOut["salary"])
	}
	if fmt.Sprintf("%v", mOut["otherIncome"]) != "15000" {
		t.Errorf("otherIncome: want 15000, got %v", mOut["otherIncome"])
	}
	if fmt.Sprintf("%v", mOut["totalIncome"]) != "65000" {
		t.Errorf("totalIncome: want 65000, got %v", mOut["totalIncome"])
	}
	if fmt.Sprintf("%v", mOut["totalSpent"]) != "16000" {
		t.Errorf("totalSpent: want 16000, got %v", mOut["totalSpent"])
	}
	if fmt.Sprintf("%v", mOut["budgetSpent"]) != "6000" {
		t.Errorf("budgetSpent: want 6000, got %v", mOut["budgetSpent"])
	}
	if fmt.Sprintf("%v", mOut["excludedSpent"]) != "10000" {
		t.Errorf("excludedSpent: want 10000, got %v", mOut["excludedSpent"])
	}
	if fmt.Sprintf("%v", mOut["left"]) != "49000" {
		t.Errorf("left: want 49000, got %v", mOut["left"])
	}
	if fmt.Sprintf("%v", mOut["savingsTotal"]) != "38000" {
		t.Errorf("savingsTotal: want 38000, got %v", mOut["savingsTotal"])
	}
	cats := asList(mOut["categories"])
	if len(cats) == 0 {
		t.Errorf("expected categories in finance summary, got 0")
	}

	// Direct Go helper function call ComputeFinanceSummary
	summaryDirect, err := handlers.ComputeFinanceSummary(a.db, alice.ID, "2026-05")
	if err != nil {
		t.Fatalf("ComputeFinanceSummary err: %v", err)
	}
	if summaryDirect.Salary.String() != "50000" ||
		summaryDirect.OtherIncome.String() != "15000" ||
		summaryDirect.TotalIncome.String() != "65000" ||
		summaryDirect.TotalSpent.String() != "16000" ||
		summaryDirect.BudgetSpent.String() != "6000" ||
		summaryDirect.ExcludedSpent.String() != "10000" ||
		summaryDirect.Left.String() != "49000" ||
		summaryDirect.SavingsTotal.String() != "38000" ||
		len(summaryDirect.Categories) == 0 {
		t.Errorf("ComputeFinanceSummary direct returned unexpected values: %+v", summaryDirect)
	}

	// Test GET /expenses?month=2026-05
	code, outExp := a.call("GET", "/expenses?month=2026-05", alice.Token, nil)
	a.expect("get may expenses", 200, code)
	mayExpenses := asList(outExp)
	if len(mayExpenses) != 4 { // expB, expC, expD, incMay (expJun is in June, expSplit is Bob's/Alice's split)
		t.Errorf("expected 4 expenses in May, got %d", len(mayExpenses))
	}

	// 7. Test July 2026 Summary
	// salary: 60 000
	// otherIncome: 0
	// totalIncome: 60 000
	// totalSpent: 0
	// budgetSpent: 0
	// excludedSpent: 0
	// left: 60 000
	// savingsTotal: 38 000
	code, out = a.call("GET", "/finance-summary?month=2026-07", alice.Token, nil)
	a.expect("get jul summary", 200, code)
	mJul := asMap(out)
	if fmt.Sprintf("%v", mJul["salary"]) != "60000" {
		t.Errorf("jul salary: want 60000, got %v", mJul["salary"])
	}
	if fmt.Sprintf("%v", mJul["totalIncome"]) != "60000" {
		t.Errorf("jul totalIncome: want 60000, got %v", mJul["totalIncome"])
	}
	if fmt.Sprintf("%v", mJul["totalSpent"]) != "0" {
		t.Errorf("jul totalSpent: want 0, got %v", mJul["totalSpent"])
	}
	if fmt.Sprintf("%v", mJul["left"]) != "60000" {
		t.Errorf("jul left: want 60000, got %v", mJul["left"])
	}
	if fmt.Sprintf("%v", mJul["savingsTotal"]) != "38000" {
		t.Errorf("jul savingsTotal: want 38000, got %v", mJul["savingsTotal"])
	}

	// 8. Test Bob isolation (Bob has no salary, expenses, or accounts)
	code, out = a.call("GET", "/finance-summary?month=2026-05", bob.Token, nil)
	a.expect("bob finance summary", 200, code)
	mBob := asMap(out)
	if fmt.Sprintf("%v", mBob["salary"]) != "0" ||
		fmt.Sprintf("%v", mBob["totalIncome"]) != "0" ||
		fmt.Sprintf("%v", mBob["totalSpent"]) != "0" ||
		fmt.Sprintf("%v", mBob["left"]) != "0" ||
		fmt.Sprintf("%v", mBob["savingsTotal"]) != "0" {
		t.Errorf("bob should have all zeros in finance summary, got: %+v", mBob)
	}
}

func TestExcludeFromBudgetBehavior(t *testing.T) {
	a := newAPI(t)
	alice := a.signup("AliceBudgetRule")

	now := time.Now().UTC()
	monthStr := now.Format("2006-01")
	todayStr := now.Format("2006-01-02")

	// Setup salary 50 000
	a.call("POST", "/salary", alice.Token, map[string]any{
		"amount":        "50000.00",
		"effectiveFrom": monthStr + "-01",
	})

	// Add regular expense 300 (included by default)
	exp1 := models.Expense{
		UserID:      alice.ID,
		Amount:      decimal.NewFromInt(300),
		Description: "Normal expense",
		Type:        models.ExpenseTypePersonal,
		ExpenseDate: now,
	}
	if err := a.db.Create(&exp1).Error; err != nil {
		t.Fatal(err)
	}

	// Add excluded expense 500 (includeInBudget: false)
	tFalse := false
	exp2 := models.Expense{
		UserID:          alice.ID,
		Amount:          decimal.NewFromInt(500),
		Description:     "Excluded expense",
		Type:            models.ExpenseTypePersonal,
		IncludeInBudget: &tFalse,
		ExpenseDate:     now,
	}
	if err := a.db.Create(&exp2).Error; err != nil {
		t.Fatal(err)
	}

	// 1. Finance summary:
	// totalSpent = 800 (shows both!)
	// budgetSpent = 300 (only normal expense!)
	// excludedSpent = 500
	code, out := a.call("GET", "/finance-summary?month="+monthStr, alice.Token, nil)
	a.expect("finance summary with excluded expense", 200, code)
	m := asMap(out)
	if fmt.Sprintf("%v", m["totalSpent"]) != "800" {
		t.Errorf("totalSpent: want 800, got %v", m["totalSpent"])
	}
	if fmt.Sprintf("%v", m["budgetSpent"]) != "300" {
		t.Errorf("budgetSpent: want 300, got %v", m["budgetSpent"])
	}
	if fmt.Sprintf("%v", m["excludedSpent"]) != "500" {
		t.Errorf("excludedSpent: want 500, got %v", m["excludedSpent"])
	}

	// 2. Server expenses summary (GetExpensesSummary at GET /dashboard):
	// total spend includes the excluded expense (D1): personalExpenses = 800
	code, out = a.call("GET", "/dashboard", alice.Token, nil)
	a.expect("dashboard expenses summary", 200, code)
	if fmt.Sprintf("%v", asMap(out)["personalExpenses"]) != "800" {
		t.Errorf("expenses summary personalExpenses: want 800, got %v", asMap(out)["personalExpenses"])
	}

	// 3. Analytics: personal total spend = 800 (includes the excluded expense, D1)
	code, out = a.call("GET", "/dashboard/analytics?months=1", alice.Token, nil)
	a.expect("analytics with excluded expense", 200, code)
	trend := asList(asMap(out)["trend"])
	if len(trend) > 0 {
		cur := asMap(trend[0])
		if cur["personal"] != float64(800) {
			t.Errorf("analytics personal: want 800, got %v", cur["personal"])
		}
	}

	// 4. Daily breakdown (lists): keeps both rows (300 and 500)
	code, out = a.call("GET", "/dashboard/expenses", alice.Token, nil)
	a.expect("dashboard expenses list", 200, code)
	breakdown := asMap(out)["expenseBreakdown"].(map[string]any)
	items := asList(breakdown[todayStr])
	if len(items) != 2 {
		t.Errorf("expected 2 items in breakdown list for %s, got %d", todayStr, len(items))
	}
}

// Regression: a plain edit that does not send includeInBudget must keep an excluded expense excluded.
func TestExcludedExpenseSurvivesPlainEdit(t *testing.T) {
	a := newAPI(t)
	alice := a.signup("AliceRegression")
	monthStr := time.Now().UTC().Format("2006-01")

	code, out := a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "500", "description": "excluded", "type": "PERSONAL", "includeInBudget": false})
	a.expect("create excluded expense", 201, code)
	id := asMap(out)["id"].(string)

	// Plain edit: the client does not send includeInBudget.
	code, _ = a.call("PUT", "/expenses/"+id, alice.Token, map[string]any{"amount": "600", "description": "edited", "type": "PERSONAL"})
	if code >= 300 {
		t.Fatalf("plain edit failed with status %d", code)
	}

	code, out = a.call("GET", "/finance-summary?month="+monthStr, alice.Token, nil)
	a.expect("finance summary after edit", 200, code)
	m := asMap(out)
	if fmt.Sprintf("%v", m["budgetSpent"]) != "0" {
		t.Errorf("budgetSpent after plain edit: want 0 (still excluded), got %v", m["budgetSpent"])
	}
	if fmt.Sprintf("%v", m["totalSpent"]) != "600" {
		t.Errorf("totalSpent after plain edit: want 600, got %v", m["totalSpent"])
	}
}

func TestFinanceOverviewAndWithdrawalGuard(t *testing.T) {
	a := newAPI(t)
	alice := a.signup("AliceOverview")

	// Account opened 2026-01-01 with 10 000
	code, out := a.call("POST", "/savings-accounts", alice.Token, map[string]any{
		"name":           "Bank",
		"kind":           "BANK",
		"openingBalance": "10000",
		"openingDate":    "2026-01-01",
	})
	a.expect("create account", 201, code)
	accID := fmt.Sprintf("%v", asMap(out)["id"])
	if asMap(out)["openingDate"] == nil {
		t.Errorf("expected openingDate in response")
	}

	code, _ = a.call("POST", "/savings-accounts", alice.Token, map[string]any{"name": "Bad", "openingDate": "not-a-date"})
	a.expect("invalid openingDate on create", 400, code)

	// Deposit 5 000 on 2026-02-10
	code, _ = a.call("POST", "/savings-accounts/"+accID+"/transactions", alice.Token, map[string]any{
		"amount": "5000", "direction": "DEPOSIT", "txnDate": "2026-02-10",
	})
	a.expect("deposit", 201, code)

	// Withdrawal above balance (balance 15 000) must be rejected
	code, _ = a.call("POST", "/savings-accounts/"+accID+"/transactions", alice.Token, map[string]any{
		"amount": "20000", "direction": "WITHDRAWAL", "txnDate": "2026-03-01",
	})
	a.expect("withdrawal over balance rejected", 400, code)

	// Withdrawal 2 000 is allowed -> balance 13 000
	code, _ = a.call("POST", "/savings-accounts/"+accID+"/transactions", alice.Token, map[string]any{
		"amount": "2000", "direction": "WITHDRAWAL", "txnDate": "2026-03-05",
	})
	a.expect("withdrawal within balance", 201, code)

	// Salary 50 000 from 2026-01-01
	code, _ = a.call("POST", "/salary", alice.Token, map[string]any{"amount": "50000", "effectiveFrom": "2026-01-01"})
	a.expect("create salary", 201, code)

	// Budget 10 000 for February 2026
	code, _ = a.call("POST", "/budgets", alice.Token, map[string]any{
		"amount": "10000", "period": "MONTHLY", "startDate": "2026-02-01", "endDate": "2026-02-28",
	})
	a.expect("create february budget", 201, code)

	// February: 12 000 counted + 5 000 excluded -> overspent by 2 000
	for _, e := range []map[string]any{
		{"amount": "12000", "description": "feb big", "type": "PERSONAL", "expenseDate": "2026-02-05T10:00:00Z"},
		{"amount": "5000", "description": "feb excluded", "type": "PERSONAL", "includeInBudget": false, "expenseDate": "2026-02-20T10:00:00Z"},
	} {
		code, _ = a.call("POST", "/expenses", alice.Token, e)
		a.expect("create expense", 201, code)
	}

	code, out = a.call("GET", "/finance/overview?month=2026-03&months=3", alice.Token, nil)
	a.expect("get overview", 200, code)
	resp := asMap(out)
	months := asList(resp["months"])
	if len(months) != 3 {
		t.Fatalf("expected 3 months, got %d", len(months))
	}
	feb := asMap(months[1])
	if feb["month"] != "2026-02" || feb["overspent"] != true || fmt.Sprintf("%v", feb["overspentBy"]) != "2000" {
		t.Errorf("february overspend wrong: %v", feb)
	}
	if fmt.Sprintf("%v", feb["savingsEnd"]) != "15000" {
		t.Errorf("february savings end want 15000, got %v", feb["savingsEnd"])
	}
	if fmt.Sprintf("%v", feb["adjustedSavings"]) != "13000" {
		t.Errorf("february adjusted savings want 13000, got %v", feb["adjustedSavings"])
	}
	if fmt.Sprintf("%v", feb["excludedSpent"]) != "5000" {
		t.Errorf("february excluded spent want 5000, got %v", feb["excludedSpent"])
	}
	if fmt.Sprintf("%v", feb["left"]) != "33000" {
		t.Errorf("february left want 33000, got %v", feb["left"])
	}
	mar := asMap(months[2])
	if mar["hasBudget"] != false || mar["overspent"] != false {
		t.Errorf("march should have no budget and no overspend: %v", mar)
	}
	if fmt.Sprintf("%v", mar["savingsEnd"]) != "13000" {
		t.Errorf("march savings end want 13000, got %v", mar["savingsEnd"])
	}

	summary := asMap(resp["summary"])
	if fmt.Sprintf("%v", summary["overspendTotal"]) != "2000" {
		t.Errorf("overspendTotal want 2000, got %v", summary["overspendTotal"])
	}
	if fmt.Sprintf("%v", summary["savingsTotal"]) != "13000" {
		t.Errorf("savingsTotal want 13000, got %v", summary["savingsTotal"])
	}
	if fmt.Sprintf("%v", summary["adjustedSavings"]) != "11000" {
		t.Errorf("adjustedSavings want 11000, got %v", summary["adjustedSavings"])
	}
	if fmt.Sprintf("%v", summary["overspentMonths"]) != "1" {
		t.Errorf("overspentMonths want 1, got %v", summary["overspentMonths"])
	}

	// Auth and validation
	code, _ = a.call("GET", "/finance/overview", "", nil)
	a.expect("overview without token", 401, code)
	code, _ = a.call("GET", "/finance/overview?months=0", alice.Token, nil)
	a.expect("overview months=0", 400, code)
	code, _ = a.call("GET", "/finance/overview?month=bad", alice.Token, nil)
	a.expect("overview bad month", 400, code)
}
