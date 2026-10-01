package handlers

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/agserror"
)

// respondError mirrors lib/api-error.ts's errorResponse: an *agserror.Detail (an AGS error a
// caller specifically unwrapped, e.g. join-by-code's invalid/expired/full codes) is passed
// through with its real status and errorCode so the frontend's agsErrorMessage helper can branch
// on it; anything else is collapsed to a generic 500. Both are logged.
func respondError(c *gin.Context, err error, context string) {
	var detail *agserror.Detail
	if errors.As(err, &detail) {
		log.Printf("[%s] failed: %d %d %s", context, detail.Status, detail.ErrorCode, detail.ErrorMessage)
		c.JSON(detail.Status, gin.H{"errorCode": detail.ErrorCode, "errorMessage": detail.ErrorMessage})
		return
	}
	log.Printf("[%s] failed: %v", context, err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
}
