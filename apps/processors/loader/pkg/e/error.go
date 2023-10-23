package e

type ErrorType string

const (
	InternalErrorType ErrorType = "internal"
	ExternalErrorType ErrorType = "external"
)

type InternalError struct {
	Code        int
	Msg         string
	Description string
}

func (e *InternalError) Error() string {
	return e.Msg
}
func NewInternalErrorWithDescription(code int, msg string, description string) *InternalError {
	return &InternalError{
		Code:        code,
		Msg:         msg,
		Description: description,
	}
}
func WrapInternalError(err error, code int, msg string) *InternalError {
	return &InternalError{
		Code:        code,
		Msg:         msg,
		Description: err.Error(),
	}
}

type ExternalError struct {
	Code        int
	Msg         string
	Description string
}

func (e *ExternalError) Error() string {
	return e.Msg
}

func NewExternalErrorWithDescription(code int, msg string, description string) *ExternalError {
	return &ExternalError{
		Code:        code,
		Msg:         msg,
		Description: description,
	}
}
func WrapExternalError(err error, code int, msg string) *ExternalError {
	return &ExternalError{
		Code:        code,
		Msg:         msg,
		Description: err.Error(),
	}
}
