// Command seed fills the database with demo data so every chart has something to show.
//
//	cd go-server && go run ./cmd/seed
//
// Log in with  alice@demo.com  /  password   (bob, charlie and diya use the same password).
// It creates ~6 months of income, personal spending, group splits and settle-ups for Alice.
// It refuses to run twice: if alice@demo.com already exists it stops without changing anything.
package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"splitwise-go/database"
	"splitwise-go/models"
	"splitwise-go/utils"

	"github.com/joho/godotenv"
	"github.com/shopspring/decimal"
)

const monthsOfHistory = 6

func ptr[T any](v T) *T { return &v }

func avatar(seed string) *string {
	return ptr(fmt.Sprintf("https://api.dicebear.com/7.x/avataaars/svg?seed=%s", seed))
}

// seeder keeps the people and categories in one place so the helpers stay short.
type seeder struct {
	rng        *rand.Rand
	categories map[string]models.Category
	today      time.Time
	count      int
}

func must(err error, what string) {
	if err != nil {
		log.Fatalf("seed failed (%s): %v", what, err)
	}
}

func money(v float64) decimal.Decimal { return decimal.NewFromFloat(v).Round(2) }

func (s *seeder) at(d time.Time, hour int) time.Time {
	return time.Date(d.Year(), d.Month(), d.Day(), hour, 0, 0, 0, time.UTC)
}

func (s *seeder) catID(name string) *string {
	c, ok := s.categories[name]
	if !ok {
		return nil
	}
	return &c.ID
}

// personal records something one person paid for themselves.
func (s *seeder) personal(u models.User, d time.Time, cat, desc string, amount float64) {
	if d.After(s.today) {
		return
	}
	e := models.Expense{
		Description: desc, Amount: money(amount), Currency: "INR", Type: models.ExpenseTypePersonal,
		ExpenseDate: s.at(d, 13), UserID: u.ID, CategoryID: s.catID(cat),
	}
	must(database.DB.Create(&e).Error, "personal expense")
	s.count++
}

func (s *seeder) income(u models.User, d time.Time, desc string, amount float64) {
	if d.After(s.today) {
		return
	}
	e := models.Expense{
		Description: desc, Amount: money(amount), Currency: "INR", Type: models.ExpenseTypeIncome,
		ExpenseDate: s.at(d, 9), UserID: u.ID,
	}
	must(database.DB.Create(&e).Error, "income")
	s.count++
}

// split records an expense paid by `payer` and shared equally by `people` (paise-exact).
// Older bills are marked as paid back so balances stay realistic.
func (s *seeder) split(payer models.User, group *models.Group, d time.Time, cat, desc string, total float64, people []models.User) {
	if d.After(s.today) {
		return
	}
	totalPaise := money(total).Shift(2).IntPart()
	n := int64(len(people))
	base, rem := totalPaise/n, totalPaise%n
	old := s.today.Sub(d) > 40*24*time.Hour

	var splits []models.ExpenseSplit
	for _, p := range people {
		share := base
		if rem > 0 {
			share++
			rem--
		}
		splits = append(splits, models.ExpenseSplit{
			UserID: p.ID, Amount: decimal.New(share, -2), SplitType: models.SplitTypeEqual,
			IsPaid: p.ID == payer.ID || old,
		})
	}
	e := models.Expense{
		Description: desc, Amount: money(total), Currency: "INR", Type: models.ExpenseTypeSplit,
		ExpenseDate: s.at(d, 20), UserID: payer.ID, CategoryID: s.catID(cat), Splits: splits,
	}
	if group != nil {
		e.GroupID = &group.ID
	}
	must(database.DB.Create(&e).Error, "split expense")
	s.count++
}

// settle records `from` paying `to` back (a settle-up, which charts never count as spending).
func (s *seeder) settle(from, to models.User, group *models.Group, d time.Time, amount float64) {
	if d.After(s.today) {
		return
	}
	e := models.Expense{
		Description: fmt.Sprintf("Settlement: %s paid %s", from.Name, to.Name), Amount: money(amount), Currency: "INR",
		Type: models.ExpenseTypeSplit, IsSettlement: true, ExpenseDate: s.at(d, 18), UserID: from.ID,
		Splits: []models.ExpenseSplit{{UserID: to.ID, Amount: money(amount), SplitType: models.SplitTypeEqual, IsPaid: true}},
	}
	if group != nil {
		e.GroupID = &group.ID
	}
	must(database.DB.Create(&e).Error, "settlement")
	s.count++
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}
	database.Connect()

	var existing int64
	database.DB.Model(&models.User{}).Where("email = ?", "alice@demo.com").Count(&existing)
	if existing > 0 {
		fmt.Println("alice@demo.com already exists - nothing to do. Reset the database first if you want fresh demo data.")
		return
	}

	fmt.Println("🌱 Seeding demo data...")
	now := time.Now().UTC()
	s := &seeder{
		rng:        rand.New(rand.NewSource(42)), // fixed seed: same demo every time
		categories: map[string]models.Category{},
		today:      time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 0, 0, time.UTC),
	}

	// ── Categories ──
	for _, c := range []struct{ name, color string }{
		{"Food", "#8ecae6"}, {"Travel", "#b8b5ff"}, {"Entertainment", "#ffe5a5"}, {"Utilities", "#b7e4c7"},
		{"Shopping", "#ffc8dd"}, {"Health", "#ffb4a2"}, {"Rent", "#a8dadc"},
	} {
		cat := models.Category{Name: c.name, Color: ptr(c.color)}
		must(database.DB.Where("name = ?", c.name).FirstOrCreate(&cat).Error, "category "+c.name)
		s.categories[c.name] = cat
	}

	// ── People ──
	hash, err := utils.GeneratePasswordHash("password")
	must(err, "hash password")
	mk := func(name, email, username string) models.User {
		u := models.User{Name: name, Email: email, Username: username, Password: hash, AvatarURL: avatar(username)}
		must(database.DB.Create(&u).Error, "user "+username)
		return u
	}
	alice := mk("Alice (Demo)", "alice@demo.com", "alice")
	bob := mk("Bob", "bob@demo.com", "bob")
	charlie := mk("Charlie", "charlie@demo.com", "charlie")
	diya := mk("Diya", "diya@demo.com", "diya")
	for _, f := range []models.User{bob, charlie, diya} {
		must(database.DB.Create(&models.Friendship{UserID: alice.ID, FriendID: f.ID, Status: models.FriendshipStatusAccepted}).Error, "friendship")
	}
	// A pending request so the Friends screen has something to accept
	eve := mk("Eve", "eve@demo.com", "eve")
	must(database.DB.Create(&models.Friendship{UserID: eve.ID, FriendID: alice.ID, Status: models.FriendshipStatusPending}).Error, "pending friendship")

	// ── Groups ──
	newGroup := func(name, desc string, admin models.User, others ...models.User) *models.Group {
		g := models.Group{Name: name, Description: ptr(desc)}
		must(database.DB.Create(&g).Error, "group "+name)
		members := []models.GroupMember{{GroupID: g.ID, UserID: admin.ID, Role: models.GroupRoleAdmin}}
		for _, o := range others {
			members = append(members, models.GroupMember{GroupID: g.ID, UserID: o.ID, Role: models.GroupRoleMember})
		}
		must(database.DB.Create(&members).Error, "members of "+name)
		return &g
	}
	flat := newGroup("Flatmates", "Rent, groceries and bills", alice, bob, diya)
	goa := newGroup("Goa Trip", "Long weekend in Goa", alice, bob, charlie)
	flatPeople := []models.User{alice, bob, diya}
	goaPeople := []models.User{alice, bob, charlie}

	// ── Month by month ──
	first := time.Date(s.today.Year(), s.today.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, -(monthsOfHistory - 1), 0)
	for m := 0; m < monthsOfHistory; m++ {
		ms := first.AddDate(0, m, 0)
		day := func(n int) time.Time { return ms.AddDate(0, 0, n-1) }
		last := m == monthsOfHistory-1

		s.income(alice, day(1), "Salary", 85000)
		if m%2 == 1 {
			s.income(alice, day(15), "Freelance project", 12000+float64(s.rng.Intn(6))*1000)
		}

		// Bills (Alice pays her own)
		s.personal(alice, day(5), "Utilities", "Electricity bill", 1400+float64(s.rng.Intn(900)))
		s.personal(alice, day(7), "Utilities", "Broadband", 999)
		s.personal(alice, day(9), "Utilities", "Mobile recharge", 599)
		s.personal(alice, day(10), "Entertainment", "Streaming subscriptions", 649)
		if m%2 == 0 {
			s.personal(alice, day(18), "Health", "Gym membership", 3000)
		}
		if m%3 == 1 {
			s.personal(alice, day(21), "Health", "Doctor visit", 900+float64(s.rng.Intn(800)))
		}
		if m%2 == 1 {
			s.personal(alice, day(23), "Shopping", "Clothes", 2500+float64(s.rng.Intn(4500)))
		}

		// Everyday spending: food most days, more on weekends; food creeps up in the latest month
		daysInMonth := ms.AddDate(0, 1, -1).Day()
		for d := 1; d <= daysInMonth; d++ {
			date := day(d)
			if date.After(s.today) {
				break
			}
			weekend := date.Weekday() == time.Saturday || date.Weekday() == time.Sunday
			foodChance, scale := 0.75, 1.0
			if weekend {
				foodChance, scale = 0.95, 1.7
			}
			if last {
				scale *= 1.25
			}
			if s.rng.Float64() < foodChance {
				names := []string{"Lunch", "Coffee & snacks", "Dinner out", "Food delivery", "Groceries"}
				s.personal(alice, date, "Food", names[s.rng.Intn(len(names))], (120+s.rng.Float64()*380)*scale)
			}
			if s.rng.Float64() < 0.22 {
				names := []string{"Auto / cab", "Metro recharge", "Fuel"}
				s.personal(alice, date, "Travel", names[s.rng.Intn(len(names))], 60+s.rng.Float64()*340)
			}
			if weekend && s.rng.Float64() < 0.35 {
				names := []string{"Movie", "Bowling", "Concert ticket", "Game night"}
				s.personal(alice, date, "Entertainment", names[s.rng.Intn(len(names))], 250+s.rng.Float64()*900)
			}
			if s.rng.Float64() < 0.06 {
				s.personal(alice, date, "Shopping", "Online order", 300+s.rng.Float64()*2200)
			}
		}

		// Flatmates: rent (Bob pays), groceries (rotating), electricity (Diya)
		s.split(bob, flat, day(2), "Rent", "House rent", 36000, flatPeople)
		s.split(diya, flat, day(6), "Utilities", "Flat electricity + water", 2400+float64(s.rng.Intn(800)), flatPeople)
		payers := []models.User{alice, bob, diya}
		for w := 0; w < 4; w++ {
			s.split(payers[(m+w)%3], flat, day(4+w*7), "Food", "Weekly groceries", 1800+float64(s.rng.Intn(1600)), flatPeople)
		}
		if m >= 1 && m <= 3 { // a few settle-ups between flatmates
			s.settle(bob, alice, flat, day(25), 3000+float64(m)*500)
		}

		// Friend dinners outside any group
		if m%2 == 0 {
			s.split(alice, nil, day(12), "Food", "Dinner with Charlie", 2200+float64(s.rng.Intn(1500)), []models.User{alice, charlie})
		}
		if m >= 3 {
			s.split(bob, nil, day(19), "Entertainment", "Cricket tickets", 3000, []models.User{alice, bob})
		}
	}

	// ── Goa trip (about two months ago) ──
	trip := time.Date(s.today.Year(), s.today.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, -2, 10)
	s.split(alice, goa, trip, "Travel", "Hotel (3 nights)", 24000, goaPeople)
	s.split(bob, goa, trip, "Travel", "Flights", 18600, goaPeople)
	s.split(charlie, goa, trip.AddDate(0, 0, 1), "Travel", "Scooter rentals", 2700, goaPeople)
	s.split(alice, goa, trip.AddDate(0, 0, 1), "Food", "Beach shack lunch", 3150, goaPeople)
	s.split(bob, goa, trip.AddDate(0, 0, 2), "Entertainment", "Water sports", 6000, goaPeople)
	s.split(charlie, goa, trip.AddDate(0, 0, 2), "Food", "Seafood dinner", 5400, goaPeople)
	s.split(alice, goa, trip.AddDate(0, 0, 3), "Shopping", "Souvenirs", 1800, goaPeople)
	s.settle(charlie, alice, goa, trip.AddDate(0, 0, 9), 5000)

	// Recent, still-unsettled bills so the Hub shows live balances
	recent := s.today.AddDate(0, 0, -6)
	s.split(alice, flat, recent, "Food", "Pizza night", 1860, flatPeople)
	s.split(diya, flat, recent.AddDate(0, 0, 2), "Utilities", "Gas cylinder", 1150, flatPeople)
	s.split(alice, nil, recent.AddDate(0, 0, 3), "Food", "Brunch with Charlie", 1640, []models.User{alice, charlie})

	fmt.Printf("✅ Done: 5 users, 2 groups, %d expenses over %d months.\n", s.count, monthsOfHistory)
	fmt.Println("   Log in with  alice@demo.com  /  password")
}
