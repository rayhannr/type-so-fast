package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

func GetBestRecords(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	records, err := ags.GetBestRecords(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "records GET")
		return
	}
	c.JSON(http.StatusOK, records)
}

func PutBestRecords(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var body struct {
		Records []float64 `json:"records"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "records is required"})
		return
	}
	if err := ags.SaveBestRecords(auth.UserID, auth.AccessToken, body.Records); err != nil {
		respondError(c, err, "records PUT")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func GetGameHistory(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	entries, err := ags.GetGameHistory(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "history GET")
		return
	}
	c.JSON(http.StatusOK, entries)
}

func PutGameHistory(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var body struct {
		Entries interface{} `json:"entries"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entries is required"})
		return
	}
	if err := ags.SaveGameHistory(auth.UserID, auth.AccessToken, body.Entries); err != nil {
		respondError(c, err, "history PUT")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func GetStreak(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	streak, err := ags.GetStreak(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "streak GET")
		return
	}
	c.JSON(http.StatusOK, streak)
}

func PutStreak(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var body struct {
		Streak interface{} `json:"streak"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "streak is required"})
		return
	}
	if err := ags.SaveStreak(auth.UserID, auth.AccessToken, body.Streak); err != nil {
		respondError(c, err, "streak PUT")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func GetProgression(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	progression, err := ags.GetProgression(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "progression GET")
		return
	}
	c.JSON(http.StatusOK, progression)
}

func PutProgression(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var body struct {
		Progression interface{} `json:"progression"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "progression is required"})
		return
	}
	if err := ags.SaveProgression(auth.UserID, auth.AccessToken, body.Progression); err != nil {
		respondError(c, err, "progression PUT")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func GetPvcProgress(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	pvc, err := ags.GetPvcProgress(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "pvc-progress GET")
		return
	}
	c.JSON(http.StatusOK, pvc)
}

func PutPvcProgress(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var body struct {
		Pvc interface{} `json:"pvc"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pvc is required"})
		return
	}
	if err := ags.SavePvcProgress(auth.UserID, auth.AccessToken, body.Pvc); err != nil {
		respondError(c, err, "pvc-progress PUT")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func GetPvpProgress(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	pvp, err := ags.GetPvpProgress(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "pvp-progress GET")
		return
	}
	c.JSON(http.StatusOK, pvp)
}

func PutPvpProgress(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var body struct {
		Pvp interface{} `json:"pvp"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pvp is required"})
		return
	}
	if err := ags.SavePvpProgress(auth.UserID, auth.AccessToken, body.Pvp); err != nil {
		respondError(c, err, "pvp-progress PUT")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func GetRoomProgress(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	room, err := ags.GetRoomProgress(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "room-progress GET")
		return
	}
	c.JSON(http.StatusOK, room)
}

func PutRoomProgress(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var body struct {
		Room interface{} `json:"room"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room is required"})
		return
	}
	if err := ags.SaveRoomProgress(auth.UserID, auth.AccessToken, body.Room); err != nil {
		respondError(c, err, "room-progress PUT")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func GetSettings(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	settings, err := ags.GetSettings(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "settings GET")
		return
	}
	c.JSON(http.StatusOK, settings)
}

func PutSettings(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var body struct {
		Settings interface{} `json:"settings"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "settings is required"})
		return
	}
	if err := ags.SaveSettings(auth.UserID, auth.AccessToken, body.Settings); err != nil {
		respondError(c, err, "settings PUT")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
