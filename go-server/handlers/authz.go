package handlers

import (
	"net/http"
	"strings"

	"splitwise-go/models"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// httpError is a validation/authorization failure with the HTTP status to return.
type httpError struct {
	Status  int
	Message string
}

func (e *httpError) Error() string { return e.Message }

func badRequest(msg string) *httpError { return &httpError{http.StatusBadRequest, msg} }
func forbidden(msg string) *httpError  { return &httpError{http.StatusForbidden, msg} }
func serverError(err error) *httpError {
	return &httpError{http.StatusInternalServerError, err.Error()}
}

// requireUserID returns the authenticated user's ID. AuthMiddleware sets it from the
// verified JWT, so it can be trusted (unlike anything in the URL or request body).
func requireUserID(c *gin.Context) (string, bool) {
	v, ok := c.Get("userId")
	id, isString := v.(string)
	if !ok || !isString || id == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return "", false
	}
	return id, true
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

func isGroupMember(db *gorm.DB, groupID, userID string) (bool, error) {
	var n int64
	err := db.Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ?", groupID, userID).
		Count(&n).Error
	return n > 0, err
}

func groupMemberSet(db *gorm.DB, groupID string) (map[string]bool, error) {
	var ids []string
	if err := db.Model(&models.GroupMember{}).
		Where("group_id = ?", groupID).
		Pluck("user_id", &ids).Error; err != nil {
		return nil, err
	}
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set, nil
}

// acceptedFriendSet returns the IDs of every user with an ACCEPTED friendship with userID.
func acceptedFriendSet(db *gorm.DB, userID string) (map[string]bool, error) {
	var ids []string
	err := db.Raw(`
		SELECT friend_id AS id FROM friendships WHERE user_id = ? AND status = 'ACCEPTED'
		UNION
		SELECT user_id AS id FROM friendships WHERE friend_id = ? AND status = 'ACCEPTED'
	`, userID, userID).Scan(&ids).Error
	if err != nil {
		return nil, err
	}
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set, nil
}

// ---------------------------------------------------------------------------
// Expense input handling
// ---------------------------------------------------------------------------

// maxExpenseAmount keeps values inside the DECIMAL(12,2) column (avoids a 500 on overflow).
var maxExpenseAmount = decimal.NewFromInt(9_999_999_999)

// sanitizeExpenseInput strips everything a client must not control. Without this, GORM would
// also create nested objects (user, group, ...) that are present in the request JSON.
func sanitizeExpenseInput(in *models.Expense) {
	in.ID = ""
	in.User = nil
	in.Group = nil
	in.Category = nil
	in.Payments = nil
	in.DeletedAt = nil

	if in.GroupID != nil && strings.TrimSpace(*in.GroupID) == "" {
		in.GroupID = nil
	}
	if in.CategoryID != nil && strings.TrimSpace(*in.CategoryID) == "" {
		in.CategoryID = nil
	}
	in.Description = strings.TrimSpace(in.Description)

	for i := range in.Splits {
		s := &in.Splits[i]
		s.ID = ""
		s.ExpenseID = ""
		s.Expense = nil
		s.User = nil
	}
}

func validSplitType(t models.SplitType) bool {
	switch t {
	case models.SplitTypeEqual, models.SplitTypeExact, models.SplitTypePercentage, models.SplitTypeShares:
		return true
	}
	return false
}

// validateExpenseShape checks the numbers and required fields (no database access).
func validateExpenseShape(in *models.Expense) *httpError {
	switch in.Type {
	case models.ExpenseTypePersonal, models.ExpenseTypeSplit, models.ExpenseTypeIncome:
	default:
		return badRequest("type must be PERSONAL, SPLIT or INCOME")
	}

	if in.Description == "" {
		return badRequest("description is required")
	}
	if !in.Amount.GreaterThan(decimal.Zero) {
		return badRequest("amount must be greater than 0")
	}
	if in.Amount.GreaterThan(maxExpenseAmount) {
		return badRequest("amount is too large")
	}

	// PERSONAL/INCOME never have splits (prevents the dashboard counting them twice).
	if in.Type != models.ExpenseTypeSplit {
		in.Splits = nil
		in.IsSettlement = false
		return nil
	}

	if len(in.Splits) == 0 {
		if in.GroupID != nil {
			return nil
		}
		return badRequest("a SPLIT expense needs at least one split")
	}

	seen := make(map[string]bool, len(in.Splits))
	sum := decimal.Zero
	for i := range in.Splits {
		s := &in.Splits[i]
		if strings.TrimSpace(s.UserID) == "" {
			return badRequest("every split needs a userId")
		}
		if seen[s.UserID] {
			return badRequest("a user can appear only once in splits")
		}
		seen[s.UserID] = true

		if !s.Amount.GreaterThan(decimal.Zero) {
			return badRequest("every split amount must be greater than 0")
		}
		if s.SplitType == "" {
			s.SplitType = models.SplitTypeEqual
		}
		if !validSplitType(s.SplitType) {
			return badRequest("splitType must be EQUAL, EXACT, PERCENTAGE or SHARES")
		}
		sum = sum.Add(s.Amount.Round(2))
	}

	if !sum.Equal(in.Amount.Round(2)) {
		return badRequest("split amounts must add up to the expense amount")
	}
	return nil
}

// authorizeExpense checks that callerID may record this expense. in.UserID is the payer.
func authorizeExpense(db *gorm.DB, callerID string, in *models.Expense) *httpError {
	if in.UserID == "" {
		in.UserID = callerID
	}
	payer := in.UserID

	if in.CategoryID != nil {
		var n int64
		if err := db.Model(&models.Category{}).Where("id = ?", *in.CategoryID).Count(&n).Error; err != nil {
			return serverError(err)
		}
		if n == 0 {
			return badRequest("unknown categoryId")
		}
	}

	if in.GroupID != nil {
		members, err := groupMemberSet(db, *in.GroupID)
		if err != nil {
			return serverError(err)
		}
		if !members[callerID] {
			return forbidden("You must be a member of this group")
		}
		if !members[payer] {
			return badRequest("The payer must be a member of the group")
		}
		for _, s := range in.Splits {
			if !members[s.UserID] {
				return badRequest("Every participant must be a member of the group")
			}
		}
		return nil
	}

	// No group:
	if in.Type != models.ExpenseTypeSplit {
		// Personal and income expenses must be recorded by the caller for themselves.
		if payer != callerID {
			return forbidden("Only the payer can record an expense outside a group")
		}
		return nil
	}

	// SPLIT expense outside a group:
	friends, err := acceptedFriendSet(db, callerID)
	if err != nil {
		return serverError(err)
	}

	// Payer must be the caller or an accepted friend
	if payer != callerID && !friends[payer] {
		return forbidden("The payer must be yourself or an accepted friend")
	}

	// Caller must be involved in the expense (as payer or participant)
	callerInvolved := (payer == callerID)
	for _, s := range in.Splits {
		if s.UserID == callerID {
			callerInvolved = true
		} else if !friends[s.UserID] {
			return forbidden("You can only split expenses with accepted friends")
		}
	}
	if !callerInvolved {
		return forbidden("You must be involved in the expense as the payer or a participant")
	}
	return nil
}

// canModifyExpense: the payer, or any member of the expense's group or split participant, may edit or delete it.
func canModifyExpense(db *gorm.DB, callerID string, exp *models.Expense) (bool, error) {
	if exp.UserID == callerID {
		return true, nil
	}
	if exp.GroupID != nil {
		return isGroupMember(db, *exp.GroupID, callerID)
	}
	for _, s := range exp.Splits {
		if s.UserID == callerID {
			return true, nil
		}
	}
	return false, nil
}

func respondError(c *gin.Context, e *httpError) {
	c.JSON(e.Status, gin.H{"error": e.Message})
}
