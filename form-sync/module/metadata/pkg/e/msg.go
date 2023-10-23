package e

var MsgFlags = map[int]string{
	SUCCESS:         "ok",
	ERROR:           "fail",
	INVALID_PARAMS:  "invalid params",
	ERROR_EXIST_TAG: "tag is exist",
	NOT_FOUND:       "not found",

	UPDATE_ERROR: "update error",
}

// GetMsg get error information based on Code
func GetMsg(code int) string {
	msg, ok := MsgFlags[code]
	if ok {
		return msg
	}

	return MsgFlags[ERROR]
}
