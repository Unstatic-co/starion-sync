package app

import (
	"net/http"

	"github.com/astaxie/beego/validation"
	"github.com/gin-gonic/gin"

	"comparer/pkg/e"

	log "github.com/sirupsen/logrus"
)

// BindAndValid binds and validates data
func BindAndValid(c *gin.Context, form interface{}) (int, int) {
	err := c.Bind(form)
	if err != nil {
		log.Error("Error binding: ", err)
		return http.StatusBadRequest, e.INVALID_PARAMS
	}

	valid := validation.Validation{}
	check, err := valid.Valid(form)
	if err != nil {
		log.Error("Error validating: ", err)
		return http.StatusInternalServerError, e.ERROR
	}
	if !check {
		for _, err := range valid.Errors {
			log.Error(err.Key, err.Message)
		}
		return http.StatusBadRequest, e.INVALID_PARAMS
	}

	return http.StatusOK, e.SUCCESS
}
