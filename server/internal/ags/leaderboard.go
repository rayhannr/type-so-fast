package ags

import (
	"errors"

	leaderboard "github.com/AccelByte/accelbyte-go-modular-sdk/leaderboard-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/leaderboard-sdk/pkg/leaderboardclient/leaderboard_data_v3"
	"github.com/AccelByte/accelbyte-go-modular-sdk/leaderboard-sdk/pkg/leaderboardclientmodels"
	"github.com/go-openapi/runtime"
	"github.com/go-openapi/strfmt"

	"type-so-fast-server/internal/agsconfig"
)

const (
	LeaderboardCode   = "wpm-alltime"
	XPLeaderboardCode = "xp-alltime"
	WeeklyCycleID     = "weekly"
)

type LeaderboardRange string

const (
	RangeAllTime LeaderboardRange = "alltime"
	RangeWeekly  LeaderboardRange = "weekly"
)

var durationLeaderboardCode = map[int]string{
	15:  "wpm-15s",
	30:  "wpm-30s",
	60:  "wpm-60s",
	120: "wpm-120s",
}

var modeLeaderboardCode = map[LeaderboardRange]map[string]string{
	RangeAllTime: {
		"words":       "wpm-alltime",
		"numbers":     "wpm-alltime-numbers",
		"punctuation": "wpm-alltime-punctuation",
	},
	RangeWeekly: {
		"words":       "wpm-weekly-words",
		"numbers":     "wpm-weekly-numbers",
		"punctuation": "wpm-weekly-punctuation",
	},
}

func DurationLeaderboardCode(duration int) (string, bool) {
	code, ok := durationLeaderboardCode[duration]
	return code, ok
}

func ModeLeaderboardCode(mode string, r LeaderboardRange) string {
	return modeLeaderboardCode[r][mode]
}

type LeaderboardEntry struct {
	Rank        int    `json:"rank"`
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	WPM         int    `json:"wpm"`
}

// noAuth sends no Authorization header: the AGS "Public" V3 leaderboard endpoints
// don't actually require a bearer token.
func noAuth() runtime.ClientAuthInfoWriter {
	return runtime.ClientAuthInfoWriterFunc(func(_ runtime.ClientRequest, _ strfmt.Registry) error {
		return nil
	})
}

func newLeaderboardDataService() *leaderboard.LeaderboardDataV3Service {
	configRepo := agsconfig.Player()
	return &leaderboard.LeaderboardDataV3Service{
		Client:           leaderboard.NewLeaderboardClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(""),
	}
}

func GetTopLeaderboard(limit int64, leaderboardCode string, cycleID string) ([]LeaderboardEntry, error) {
	service := newLeaderboardDataService()
	namespace := agsconfig.Namespace()

	var points []*leaderboardclientmodels.ModelsUserPoint

	if cycleID != "" {
		params := leaderboard_data_v3.NewGetCurrentCycleLeaderboardRankingPublicV3Params()
		params.Namespace = namespace
		params.LeaderboardCode = leaderboardCode
		params.CycleID = cycleID
		params.Limit = &limit
		params.AuthInfoWriter = noAuth()

		resp, err := service.GetCurrentCycleLeaderboardRankingPublicV3Short(params)
		if err != nil {
			var notFound *leaderboard_data_v3.GetCurrentCycleLeaderboardRankingPublicV3NotFound
			if errors.As(err, &notFound) {
				return []LeaderboardEntry{}, nil
			}
			return nil, err
		}
		points = resp.Data.Data
	} else {
		params := leaderboard_data_v3.NewGetAllTimeLeaderboardRankingPublicV3Params()
		params.Namespace = namespace
		params.LeaderboardCode = leaderboardCode
		params.Limit = &limit
		params.AuthInfoWriter = noAuth()

		resp, err := service.GetAllTimeLeaderboardRankingPublicV3Short(params)
		if err != nil {
			var notFound *leaderboard_data_v3.GetAllTimeLeaderboardRankingPublicV3NotFound
			if errors.As(err, &notFound) {
				return []LeaderboardEntry{}, nil
			}
			return nil, err
		}
		points = resp.Data.Data
	}

	entries := make([]LeaderboardEntry, 0, len(points))
	for i, p := range points {
		userID := ""
		if p.UserID != nil {
			userID = *p.UserID
		}
		point := 0.0
		if p.Point != nil {
			point = *p.Point
		}
		displayName := shortUserID(userID)
		if additionalData, ok := p.AdditionalData.(map[string]interface{}); ok {
			if name, ok := additionalData["displayName"].(string); ok && name != "" {
				displayName = name
			}
		}
		entries = append(entries, LeaderboardEntry{
			Rank:        i + 1,
			UserID:      userID,
			DisplayName: displayName,
			WPM:         int(point),
		})
	}
	return entries, nil
}

func shortUserID(userID string) string {
	if len(userID) > 8 {
		return userID[:8]
	}
	return userID
}
