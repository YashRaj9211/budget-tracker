package functions

import (
	"splitwise-go/models"
	"splitwise-go/utils"
	"time"
	"github.com/shopspring/decimal"
)

func SimplifyDebts(expenses *[]models.Expense) {
	// 1. Calculate net balances for each user
	balances := make(map[string]decimal.Decimal)

	for _, diet := range *expenses {
		payerID := diet.UserID
		for _, split := range diet.Splits {
			if split.IsPaid {
				continue
			}

			// Payer gets +amount (they are owed this)
			// Split user gets -amount (they owe this)
			// Note: If payer is the split user (their own share), it cancels out (+X -X = 0)

			amount := split.Amount

			// Initialize decimal.Decimal if not present
			if _, ok := balances[payerID]; !ok {
				balances[payerID] = decimal.Zero
			}
			if _, ok := balances[split.UserID]; !ok {
				balances[split.UserID] = decimal.Zero
			}

			balances[payerID] = balances[payerID].Add(amount)
			balances[split.UserID] = balances[split.UserID].Sub(amount)
		}
	}

	// 2. Separate into debtors and creditors
	type Account struct {
		UserID string
		Amount decimal.Decimal
	}
	var debtors []Account
	var creditors []Account

	for userID, amount := range balances {
		if amount.GreaterThan(decimal.Zero) {
			creditors = append(creditors, Account{UserID: userID, Amount: amount})
		} else if amount.LessThan(decimal.Zero) {
			debtors = append(debtors, Account{UserID: userID, Amount: amount})
		}
	}

	// 3. Match them (Simplification)
	var simplifiedExpenses []models.Expense

	// Greedy approach: Match simplified debts
	// While we have both debtors and creditors
	dIndex := 0
	cIndex := 0

	for dIndex < len(debtors) && cIndex < len(creditors) {
		debtor := &debtors[dIndex]
		creditor := &creditors[cIndex]

		// Amount to settle is min(abs(debtorAmount), creditorAmount)
		debtorAbs := debtor.Amount.Abs()
		settleAmount := decimal.Min(debtorAbs, creditor.Amount)

		// Create a "Simplified Debt" Expense
		// "Debtor owes Creditor" => Creditor paid for Debtor
		simpleExp := models.Expense{
			ID:          "simple-" + debtor.UserID + "-" + creditor.UserID + "-" + utils.GenerateUUID("simp"),
			Description: "Simplified Debt",
			Amount:      settleAmount,
			Currency:    "INR", // Default or derive
			Type:        models.ExpenseTypeSplit,
			UserID:      creditor.UserID, // Creditor is the "Payer" (Owed Person)
			ExpenseDate: time.Now(),
			Splits: []models.ExpenseSplit{
				{
					UserID:    debtor.UserID, // Debtor is the one who splits (Owes)
					Amount:    settleAmount,
					SplitType: models.SplitTypeExact,
					IsPaid:    false,
				},
			},
		}
		simplifiedExpenses = append(simplifiedExpenses, simpleExp)

		// Update balances
		debtor.Amount = debtor.Amount.Add(settleAmount)     // -10 + 5 = -5 (reduces debt)
		creditor.Amount = creditor.Amount.Sub(settleAmount) // 10 - 5 = 5 (reduces credit)

		// Move indices if settled
		if debtor.Amount.Equal(decimal.Zero) {
			dIndex++
		}
		if creditor.Amount.Equal(decimal.Zero) {
			cIndex++
		}
	}

	*expenses = simplifiedExpenses
}
