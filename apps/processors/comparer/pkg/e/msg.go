package e

var MsgFlags = map[int]string{
	SUCCESS:         "ok",
	ERROR:           "fail",
	INVALID_PARAMS:  "invalid params",
	ERROR_EXIST_TAG: "tag is exist",

	COMPARE_ERROR: "compare error",
}

// GetMsg get error information based on Code
func GetMsg(code int) string {
	msg, ok := MsgFlags[code]
	if ok {
		return msg
	}

	return MsgFlags[ERROR]
}
