package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"os"
	"time"

	"github.com/resend/resend-go/v4"
)

func SendOTP(email, otp, templateName, subject string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY not set")
	}

	client := resend.NewClient(apiKey)

	// Parse the HTML template
	t, err := template.ParseFiles("templates/" + templateName)
	if err != nil {
		log.Printf("Failed to parse email template: %v", err)
		return err
	}

	// Prepare the data for the template
	data := struct {
		OTP     string
		LogoURL string
		Year    int
	}{
		OTP:     otp,
		LogoURL: "https://budget-tracker-phi-ivory.vercel.app/budget-tracker-icon.png", // Using a placeholder URL, user needs to host it
		Year:    time.Now().Year(),
	}

	var body bytes.Buffer
	if err := t.Execute(&body, data); err != nil {
		log.Printf("Failed to execute email template: %v", err)
		return err
	}

	params := &resend.SendEmailRequest{
		From:    "noreply@dekhkar.prjly.org", // Updated to your newly verified domain!
		To:      []string{email},
		Subject: subject,
		Html:    body.String(),
	}

	sent, err := client.Emails.Send(params)
	if err != nil {
		log.Printf("Failed to send OTP to %s: %v", email, err)
		return err
	}

	log.Printf("OTP email sent to %s, id: %s", email, sent.Id)
	return nil
}

type FriendRequestEmailData struct {
	RecipientName string
	SenderName    string
	SenderEmail   string
	ActionURL     string
	LogoURL       string
	Year          int
}

// SendFriendRequestEmail sends an email notification to the recipient of a friend request.
func SendFriendRequestEmail(toEmail, recipientName, senderName, senderEmail string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		log.Printf("RESEND_API_KEY not set; skipping friend request email to %s", toEmail)
		return nil
	}

	client := resend.NewClient(apiKey)

	t, err := template.ParseFiles("templates/friend_request.html")
	if err != nil {
		log.Printf("Failed to parse friend request email template: %v", err)
		return err
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://budget-tracker-phi-ivory.vercel.app"
	}
	actionURL := fmt.Sprintf("%s/friends", frontendURL)

	displayName := senderName
	if displayName == "" {
		displayName = senderEmail
	}

	data := FriendRequestEmailData{
		RecipientName: recipientName,
		SenderName:    displayName,
		SenderEmail:   senderEmail,
		ActionURL:     actionURL,
		LogoURL:       "https://budget-tracker-phi-ivory.vercel.app/budget-tracker-icon.png",
		Year:          time.Now().Year(),
	}

	var body bytes.Buffer
	if err := t.Execute(&body, data); err != nil {
		log.Printf("Failed to execute friend request email template: %v", err)
		return err
	}

	subject := fmt.Sprintf("%s sent you a friend request on Divvit", displayName)
	params := &resend.SendEmailRequest{
		From:    "noreply@dekhkar.prjly.org",
		To:      []string{toEmail},
		Subject: subject,
		Html:    body.String(),
	}

	sent, err := client.Emails.Send(params)
	if err != nil {
		log.Printf("Failed to send friend request email to %s: %v", toEmail, err)
		return err
	}

	log.Printf("Friend request email sent to %s, id: %s", toEmail, sent.Id)
	return nil
}
