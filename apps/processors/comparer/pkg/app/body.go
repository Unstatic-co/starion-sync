package app

import (
	"github.com/astaxie/beego/validation"
	"github.com/gin-gonic/gin"

	"comparer/pkg/e"
)

// BindAndValid binds and validates data
func BindAndValid(c *gin.Context, form interface{}) error {
	err := c.Bind(form)
	if err != nil {
		return e.WrapInternalError(err, e.ERROR, "Error binding form")
	}

	valid := validation.Validation{}
	check, err := valid.Valid(form)
	if err != nil {
		return e.WrapInternalError(err, e.ERROR, "Error validating form")
	}
	if !check {
		return e.NewInternalErrorWithDescription(e.INVALID_PARAMS, "Invalid Params", valid.Errors[0].Error())
	}

	return nil
}
