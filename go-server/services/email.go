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
