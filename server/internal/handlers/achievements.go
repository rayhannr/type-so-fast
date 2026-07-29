package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
	"type-so-fast-server/internal/apiauth"
)

var wordModes = []string{"words", "numbers", "punctuation"}
var durations = []int{15, 30, 60, 120}

func containsString(values []string, target string) bool {
	for _, v := range values {
		if v == target {
			return true
		}
	}
	return false
}

func containsInt(values []int, target int) bool {
	for _, v := range values {
		if v == target {
			return true
		}
	}
	return false
}

func ListAchievements(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	achievements, err := ags.GetUnlockedAchievements(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "achievements GET")
		return
	}
	c.JSON(http.StatusOK, achievements)
}

func AchievementsCatalog(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	list, err := ags.GetAchievementList(auth.UserID, auth.AccessToken)
	if err != nil {
		respondError(c, err, "achievements/list GET")
		return
	}
	c.JSON(http.StatusOK, list)
}

func SubmitAchievements(c *gin.Context) {
	auth := apiauth.FromHeaders(c.GetHeader("Authorization"), c.GetHeader("X-User-Id"))
	if auth == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		Accuracy        float64  `json:"accuracy"`
		PreviousCodes   []string `json:"previousCodes"`
		Streak          int      `json:"streak"`
		PerfectStreak   int      `json:"perfectStreak"`
		ModesPlayed     []string `json:"modesPlayed"`
		DurationsPlayed []int    `json:"durationsPlayed"`
		Pvc             *struct {
			Difficulty  string          `json:"difficulty"`
			Won         bool            `json:"won"`
			PvcProgress ags.PvcProgress `json:"pvcProgress"`
		} `json:"pvc"`
		Pvp *struct {
			Outcome     string          `json:"outcome"`
			PvpProgress ags.PvpProgress `json:"pvpProgress"`
		} `json:"pvp"`
		Room *struct {
			Won          bool             `json:"won"`
			FullHouse    bool             `json:"fullHouse"`
			RoomProgress ags.RoomProgress `json:"roomProgress"`
		} `json:"room"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	ags.UnlockPerfectionistIfEligible(auth.UserID, auth.AccessToken, body.Accuracy)
	ags.UnlockStreakAchievementsIfEligible(auth.UserID, auth.AccessToken, body.Streak)
	ags.UnlockPerfectStreakIfEligible(auth.UserID, auth.AccessToken, body.PerfectStreak)

	allModesPlayed := true
	for _, mode := range wordModes {
		if !containsString(body.ModesPlayed, mode) {
			allModesPlayed = false
			break
		}
	}
	allDurationsPlayed := true
	for _, duration := range durations {
		if !containsInt(body.DurationsPlayed, duration) {
			allDurationsPlayed = false
			break
		}
	}
	ags.UnlockVarietyIfEligible(auth.UserID, auth.AccessToken, allModesPlayed, allDurationsPlayed)

	if body.Pvc != nil {
		ags.UnlockPvcAchievementsIfEligible(auth.UserID, auth.AccessToken, body.Pvc.Difficulty, body.Pvc.Won, body.Accuracy, body.Pvc.PvcProgress)
	}
	if body.Pvp != nil {
		ags.UnlockPvpAchievementsIfEligible(auth.UserID, auth.AccessToken, body.Pvp.Outcome, body.Accuracy, body.Pvp.PvpProgress)
	}
	if body.Room != nil {
		ags.UnlockRoomAchievementsIfEligible(auth.UserID, auth.AccessToken, body.Room.Won, body.Room.FullHouse, body.Room.RoomProgress)
	}

	newlyUnlocked, err := ags.DiffNewlyUnlocked(auth.UserID, auth.AccessToken, body.PreviousCodes)
	if err != nil {
		respondError(c, err, "achievements POST")
		return
	}
	c.JSON(http.StatusOK, newlyUnlocked)
}
