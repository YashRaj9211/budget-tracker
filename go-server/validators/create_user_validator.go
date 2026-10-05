package validators

import (
	"github.com/go-playground/validator/v10"
)

type CreateUserValidator struct {
	Email     string  `json:"email" validate:"required,email"`
	Name      string  `json:"name" validate:"required,alpha"`
	Username  string  `json:"username" validate:"required,alphanum"`
	Password  string  `json:"password" validate:"required,min=8,max=32"`
	Phone     *string `json:"phone,omitempty" validate:"omitempty,numeric"`
	AvatarURL *string `json:"avatarUrl,omitempty" validate:"omitempty,url"`
	Code      string  `json:"code" validate:"required,len=6"`
}

type ExpenseValidator struct {
	
}

func CreateUserValidatorFn(user *CreateUserValidator) error {
	validate := validator.New()
	return validate.Struct(user)
}
