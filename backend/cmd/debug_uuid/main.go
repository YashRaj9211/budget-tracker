package main

import (
	"fmt"
	"splitwise-go/utils"
)

func main() {
	id := utils.GenerateUUID("group")
	fmt.Printf("Generated UUID: %s\n", id)
}
