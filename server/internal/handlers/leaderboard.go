package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"type-so-fast-server/internal/ags"
)

var validModes = map[string]bool{"words": true, "numbers": true, "punctuation": true}

func Leaderboard(c *gin.Context) {
	limit := int64(10)
	if v, err := strconv.ParseInt(c.Query("limit"), 10, 64); err == nil {
		limit = v
	}

	if c.Query("metric") == "xp" {
		entries, err := ags.GetTopLeaderboard(limit, ags.XPLeaderboardCode, "")
		if err != nil {
			log.Printf("[leaderboard] GET failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}
		c.JSON(http.StatusOK, entries)
		return
	}

	mode := c.Query("mode")
	if !validModes[mode] {
		mode = "words"
	}
	leaderboardRange := ags.RangeAllTime
	if c.Query("range") == "weekly" {
		leaderboardRange = ags.RangeWeekly
	}

	leaderboardCode := ags.LeaderboardCode
	cycleID := ""

	if durationParam, err := strconv.Atoi(c.Query("duration")); err == nil {
		if code, ok := ags.DurationLeaderboardCode(durationParam); ok {
			leaderboardCode = code
		} else {
			leaderboardCode = ags.ModeLeaderboardCode(mode, leaderboardRange)
			if leaderboardRange == ags.RangeWeekly {
				cycleID = ags.WeeklyCycleID
			}
		}
	} else {
		leaderboardCode = ags.ModeLeaderboardCode(mode, leaderboardRange)
		if leaderboardRange == ags.RangeWeekly {
			cycleID = ags.WeeklyCycleID
		}
	}

	entries, err := ags.GetTopLeaderboard(limit, leaderboardCode, cycleID)
	if err != nil {
		log.Printf("[leaderboard] GET failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(http.StatusOK, entries)
}
