package models

import (
	"time"

	"splitwise-go/utils"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Enums
type FriendshipStatus string

const (
	FriendshipStatusPending  FriendshipStatus = "PENDING"
	FriendshipStatusAccepted FriendshipStatus = "ACCEPTED"
	FriendshipStatusBlocked  FriendshipStatus = "BLOCKED"
)

type GroupRole string

const (
	GroupRoleAdmin  GroupRole = "ADMIN"
	GroupRoleMember GroupRole = "MEMBER"
)

type ExpenseType string

const (
	ExpenseTypePersonal ExpenseType = "PERSONAL"
	ExpenseTypeSplit    ExpenseType = "SPLIT"
	ExpenseTypeIncome   ExpenseType = "INCOME"
)

type SplitType string

const (
	SplitTypeEqual      SplitType = "EQUAL"
	SplitTypeExact      SplitType = "EXACT"
	SplitTypePercentage SplitType = "PERCENTAGE"
	SplitTypeShares     SplitType = "SHARES"
)

type BudgetPeriod string

const (
	BudgetPeriodDaily   BudgetPeriod = "DAILY"
	BudgetPeriodWeekly  BudgetPeriod = "WEEKLY"
	BudgetPeriodMonthly BudgetPeriod = "MONTHLY"
	BudgetPeriodYearly  BudgetPeriod = "YEARLY"
	BudgetPeriodCustom  BudgetPeriod = "CUSTOM"
)

type Roles string

const (
	RolesAdmin   Roles = "ADMIN"
	RolesUser    Roles = "USER"
	RolesGuest   Roles = "GUEST"
	RolesBot     Roles = "BOT"
	RolesManager Roles = "MANAGER"
	RolesAPI     Roles = "API"
)

// User model
type User struct {
	ID        string     `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Email     string     `gorm:"uniqueIndex;not null" json:"email"`
	Name      string     `gorm:"not null" json:"name"`
	Username  string     `gorm:"uniqueIndex;not null" json:"username"`
	Password  string     `gorm:"not null" json:"-"`
	Phone     *string    `gorm:"type:varchar(20)" json:"phone,omitempty"`
	AvatarURL *string    `gorm:"column:avatar_url" json:"avatarUrl,omitempty"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt *time.Time `gorm:"index" json:"-"`

	// Relations
	Expenses             []Expense      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"expenses,omitempty"`
	GroupMembers         []GroupMember  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"groupMembers,omitempty"`
	Splits               []ExpenseSplit `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"splits,omitempty"`
	FriendshipsInitiated []Friendship   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"friendshipsInitiated,omitempty"`
	FriendshipsReceived  []Friendship   `gorm:"foreignKey:FriendID;constraint:OnDelete:CASCADE" json:"friendshipsReceived,omitempty"`
	PaymentsMade         []Payment      `gorm:"foreignKey:PayerID;constraint:OnDelete:CASCADE" json:"paymentsMade,omitempty"`
	PaymentsReceived     []Payment      `gorm:"foreignKey:ReceiverID;constraint:OnDelete:CASCADE" json:"paymentsReceived,omitempty"`
}

func (User) TableName() string {
	return "users"
}

// Friendship model
type Friendship struct {
	ID        string           `gorm:"primaryKey;type:varchar(50)" json:"id"`
	UserID    string           `gorm:"not null;index;uniqueIndex:idx_user_friend" json:"userId"`
	FriendID  string           `gorm:"not null;index;uniqueIndex:idx_user_friend" json:"friendId"`
	Status    FriendshipStatus `gorm:"type:varchar(20);default:'PENDING'" json:"status"`
	CreatedAt time.Time        `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time        `gorm:"autoUpdateTime" json:"updatedAt"`

	// Relations
	User   User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Friend User `gorm:"foreignKey:FriendID;constraint:OnDelete:CASCADE" json:"friend,omitempty"`
}

func (Friendship) TableName() string {
	return "friendships"
}

// Group model
type Group struct {
	ID            string     `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Name          string     `gorm:"not null;index" json:"name"`
	Description   *string    `json:"description,omitempty"`
	ImageURL      *string    `gorm:"column:image_url" json:"imageUrl,omitempty"`
	SimplifyDebts bool       `gorm:"default:false" json:"simplifyDebts"`
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt     *time.Time `gorm:"index" json:"-"`

	// Relations
	Members  []GroupMember `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"members,omitempty"`
	Expenses []Expense     `gorm:"foreignKey:GroupID;constraint:OnDelete:SET NULL" json:"expenses,omitempty"`
}

func (Group) TableName() string {
	return "groups"
}

// GroupMember model
type GroupMember struct {
	ID       string    `gorm:"primaryKey;type:varchar(50)" json:"id"`
	GroupID  string    `gorm:"not null;index;uniqueIndex:idx_group_user" json:"groupId"`
	UserID   string    `gorm:"not null;index;uniqueIndex:idx_group_user" json:"userId"`
	Role     GroupRole `gorm:"type:varchar(20);default:'MEMBER'" json:"role"`
	JoinedAt time.Time `gorm:"autoCreateTime" json:"joinedAt"`

	// Relations
	Group Group `gorm:"foreignKey:GroupID;constraint:OnDelete:CASCADE" json:"group,omitempty"`
	User  User  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

func (GroupMember) TableName() string {
	return "group_members"
}

// Category model
type Category struct {
	ID        string     `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Name      string     `gorm:"uniqueIndex;not null" json:"name"`
	Icon      *string    `json:"icon,omitempty"`
	Color     *string    `json:"color,omitempty"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	DeletedAt *time.Time `gorm:"index" json:"-"`

	// Relations
	Expenses []Expense `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL" json:"expenses,omitempty"`
}

func (Category) TableName() string {
	return "categories"
}

// Expense model
type Expense struct {
	ID           string          `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Amount       decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"amount"`
	Currency     string          `gorm:"default:'INR'" json:"currency"`
	Description  string          `gorm:"not null" json:"description"`
	Note         *string         `json:"note,omitempty"`
	Type         ExpenseType     `gorm:"type:varchar(20);not null;index" json:"type"`
	IsSettlement bool            `gorm:"not null;default:false" json:"isSettlement"` // true for "settle up" payments
	ExpenseDate  time.Time       `gorm:"not null;index" json:"expenseDate"`
	CreatedAt    time.Time       `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt    time.Time       `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt    *time.Time      `gorm:"index" json:"-"`

	UserID     string  `gorm:"not null;index" json:"userId"`
	CategoryID *string `gorm:"index" json:"categoryId,omitempty"`
	GroupID    *string `gorm:"index" json:"groupId,omitempty"`

	// Relations
	User     *User          `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Category *Category      `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL" json:"category,omitempty"`
	Group    *Group         `gorm:"foreignKey:GroupID;constraint:OnDelete:SET NULL" json:"group,omitempty"`
	Splits   []ExpenseSplit `gorm:"foreignKey:ExpenseID;constraint:OnDelete:CASCADE" json:"splits,omitempty"`
	Payments []Payment      `gorm:"foreignKey:ExpenseID;constraint:OnDelete:SET NULL" json:"payments,omitempty"`
}

func (Expense) TableName() string {
	return "expenses"
}

// ExpenseSplit model
type ExpenseSplit struct {
	ID         string           `gorm:"primaryKey;type:varchar(50)" json:"id"`
	ExpenseID  string           `gorm:"not null;index;uniqueIndex:idx_expense_user" json:"expenseId"`
	UserID     string           `gorm:"not null;index;uniqueIndex:idx_expense_user" json:"userId"`
	Amount     decimal.Decimal  `gorm:"type:decimal(12,2);not null" json:"amount"`
	SplitType  SplitType        `gorm:"type:varchar(20);not null" json:"splitType"`
	Percentage *decimal.Decimal `gorm:"type:decimal(5,2)" json:"percentage,omitempty"`
	IsPaid     bool             `gorm:"default:false;index" json:"isPaid"`
	CreatedAt  time.Time        `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt  time.Time        `gorm:"autoUpdateTime" json:"updatedAt"`

	// Relations
	Expense *Expense `gorm:"foreignKey:ExpenseID;constraint:OnDelete:CASCADE" json:"expense,omitempty"`
	User    *User    `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

func (ExpenseSplit) TableName() string {
	return "expense_splits"
}

// Payment model
type Payment struct {
	ID          string          `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Amount      decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"amount"`
	Currency    string          `gorm:"default:'USD'" json:"currency"`
	Description *string         `json:"description,omitempty"`
	PaymentDate time.Time       `gorm:"index;autoCreateTime" json:"paymentDate"`
	CreatedAt   time.Time       `gorm:"autoCreateTime" json:"createdAt"`
	DeletedAt   *time.Time      `gorm:"index" json:"-"`

	PayerID    string  `gorm:"not null;index" json:"payerId"`
	ReceiverID string  `gorm:"not null;index" json:"receiverId"`
	ExpenseID  *string `gorm:"index" json:"expenseId,omitempty"`

	// Relations
	Payer    User     `gorm:"foreignKey:PayerID;constraint:OnDelete:CASCADE" json:"payer,omitempty"`
	Receiver User     `gorm:"foreignKey:ReceiverID;constraint:OnDelete:CASCADE" json:"receiver,omitempty"`
	Expense  *Expense `gorm:"foreignKey:ExpenseID;constraint:OnDelete:SET NULL" json:"expense,omitempty"`
}

func (Payment) TableName() string {
	return "payments"
}

// Budget model
type Budget struct {
	ID         string          `gorm:"primaryKey;type:varchar(50)" json:"id"`
	UserID     string          `gorm:"not null;index" json:"userId"`
	CategoryID *string         `gorm:"index" json:"categoryId,omitempty"`
	Amount     decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"amount"`
	Period     BudgetPeriod    `gorm:"type:varchar(20);not null" json:"period"`
	StartDate  time.Time       `gorm:"not null;index:idx_budget_dates" json:"startDate"`
	EndDate    time.Time       `gorm:"not null;index:idx_budget_dates" json:"endDate"`
	CreatedAt  time.Time       `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt  time.Time       `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt  *time.Time      `gorm:"index" json:"-"`
}

func (Budget) TableName() string {
	return "budgets"
}

// OTP model for login/verification
type OTP struct {
	ID        string    `gorm:"primaryKey;type:varchar(50)" json:"id"`
	Email     string    `gorm:"not null;index" json:"email"`
	Code      string    `gorm:"not null" json:"code"`
	ExpiresAt time.Time `gorm:"not null" json:"expiresAt"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
}

func (OTP) TableName() string {
	return "otps"
}

// BeforeCreate hooks to generate CUIDs (you'll need to implement CUID generation)
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = utils.GenerateUUID("user")
	}
	return nil
}

func (f *Friendship) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = utils.GenerateUUID("friend")
	}
	return nil
}

func (g *Group) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = utils.GenerateUUID("group")
	}
	return nil
}

func (gm *GroupMember) BeforeCreate(tx *gorm.DB) error {
	if gm.ID == "" {
		gm.ID = utils.GenerateUUID("member")
	}
	return nil
}

func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = utils.GenerateUUID("category")
	}
	return nil
}

func (e *Expense) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = utils.GenerateUUID("expense")
	}
	return nil
}

func (es *ExpenseSplit) BeforeCreate(tx *gorm.DB) error {
	if es.ID == "" {
		es.ID = utils.GenerateUUID("split")
	}
	return nil
}

func (p *Payment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = utils.GenerateUUID("payment")
	}
	return nil
}

func (b *Budget) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = utils.GenerateUUID("budget")
	}
	return nil
}

func (o *OTP) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = utils.GenerateUUID("otp")
	}
	return nil
}

