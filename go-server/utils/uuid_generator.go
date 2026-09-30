package utils

import (
	"fmt"

	"github.com/google/uuid"
)

func GenerateUUID(namespace string) string {
	if namespace == "" {
		return uuid.New().String()
	}
	return fmt.Sprintf("%s-%s", namespace, uuid.New())
}
