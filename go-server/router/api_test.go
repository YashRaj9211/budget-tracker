package router_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"splitwise-go/models"
	"splitwise-go/router"
	"splitwise-go/testutil"

	"github.com/gin-gonic/gin"
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
	if code, out := pub("signup", map[string]any{"email": email, "name": name, "username": uid, "password": "password123"}); code != 200 {
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
	if len(asList(asMap(out)["groups"])) != 1 || len(asList(asMap(out)["expenses"])) != 1 {
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
	if err := a.db.Create(&models.Category{ID: "food", Name: "Food"}).Error; err != nil {
		t.Fatal(err)
	}

	code, _ := a.call("GET", "/dashboard/analytics?months=13", alice.Token, nil)
	a.expect("months too large", 400, code)
	code, _ = a.call("GET", "/dashboard/analytics", "", nil)
	a.expect("analytics without token", 401, code)

	// alice: personal 100 (Food), income 1000, split 200 with bob (100 each), settlement 50 (ignored)
	a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "100", "description": "lunch", "type": "PERSONAL", "categoryId": "food"})
	a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "1000", "description": "pay", "type": "INCOME"})
	a.call("POST", "/expenses", alice.Token, map[string]any{"amount": "200", "description": "dinner", "type": "SPLIT", "categoryId": "food", "splits": []any{split(alice.ID, "100"), split(bob.ID, "100")}})
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
	a.db.Create(&models.Category{ID: "b", Name: "Travel"})
	a.db.Create(&models.Category{ID: "a", Name: "Food"})
	code, out := a.call("GET", "/categories", alice.Token, nil)
	a.expect("list categories", 200, code)
	list := asList(out)
	if len(list) != 2 || asMap(list[0])["name"] != "Food" {
		t.Errorf("want [Food, Travel] sorted by name, got %v", out)
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
