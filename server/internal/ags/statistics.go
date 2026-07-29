package ags

import (
	social "github.com/AccelByte/accelbyte-go-modular-sdk/social-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/social-sdk/pkg/socialclient/user_statistic"
	"github.com/AccelByte/accelbyte-go-modular-sdk/social-sdk/pkg/socialclientmodels"

	"type-so-fast-server/internal/agsconfig"
)

const (
	statBestWpm         = "best-wpm"
	statGamesPlayed     = "games-played"
	statTotalWordsTyped = "total-words-typed"
	statTotalXp         = "total-xp"
	statLevel           = "level"
)

var statBestWpmByDuration = map[int]string{
	15:  "best-wpm-15s",
	30:  "best-wpm-30s",
	60:  "best-wpm-60s",
	120: "best-wpm-120s",
}

// 'words' reuses the base best-wpm stat since it's the default mode.
var statBestWpmByMode = map[string]string{
	"words":       "best-wpm",
	"numbers":     "best-wpm-numbers",
	"punctuation": "best-wpm-punctuation",
}

type GameResultStats struct {
	Wpm         float64 `json:"wpm"`
	WordsTyped  float64 `json:"wordsTyped"`
	DisplayName string  `json:"displayName"`
	Duration    int     `json:"duration"`
	Mode        string  `json:"mode"`
	XpEarned    float64 `json:"xpEarned"`
	Level       float64 `json:"level"`
}

type PersonalStats struct {
	BestWpm         float64 `json:"bestWpm"`
	GamesPlayed     float64 `json:"gamesPlayed"`
	TotalWordsTyped float64 `json:"totalWordsTyped"`
}

func newUserStatisticService(accessToken string) *social.UserStatisticService {
	configRepo := agsconfig.Player()
	return &social.UserStatisticService{
		Client:           social.NewSocialClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

func updateStatItemValue(service *social.UserStatisticService, userID, statCode, updateStrategy string, value float64, displayName string) error {
	params := user_statistic.NewUpdateUserStatItemValue1Params()
	params.Namespace = agsconfig.Namespace()
	params.UserID = userID
	params.StatCode = statCode
	body := &socialclientmodels.StatItemUpdate{
		UpdateStrategy: &updateStrategy,
		Value:          &value,
	}
	if displayName != "" {
		body.AdditionalData = map[string]interface{}{"displayName": displayName}
	}
	params.Body = body

	_, err := service.UpdateUserStatItemValue1Short(params)
	return err
}

func SubmitGameStats(userID, accessToken string, result GameResultStats) error {
	service := newUserStatisticService(accessToken)

	modeStatCode := statBestWpmByMode[result.Mode]
	durationStatCode := statBestWpmByDuration[result.Duration]

	updates := map[string]float64{
		statBestWpm:      result.Wpm,
		durationStatCode: result.Wpm,
	}
	if modeStatCode != statBestWpm {
		updates[modeStatCode] = result.Wpm
	}

	errCh := make(chan error, len(updates)+3)
	for statCode, value := range updates {
		go func(statCode string, value float64) {
			errCh <- updateStatItemValue(service, userID, statCode, "MAX", value, result.DisplayName)
		}(statCode, value)
	}
	go func() {
		errCh <- updateStatItemValue(service, userID, statGamesPlayed, "INCREMENT", 1, "")
	}()
	go func() {
		errCh <- updateStatItemValue(service, userID, statTotalWordsTyped, "INCREMENT", result.WordsTyped, "")
	}()
	go func() {
		errCh <- updateStatItemValue(service, userID, statTotalXp, "INCREMENT", result.XpEarned, result.DisplayName)
	}()
	go func() {
		errCh <- updateStatItemValue(service, userID, statLevel, "MAX", result.Level, "")
	}()

	total := len(updates) + 4
	var firstErr error
	for i := 0; i < total; i++ {
		if err := <-errCh; err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func GetPersonalStats(userID, accessToken string) (*PersonalStats, error) {
	service := newUserStatisticService(accessToken)
	params := user_statistic.NewPublicQueryUserStatItemsParams()
	params.Namespace = agsconfig.Namespace()
	params.UserID = userID
	params.StatCodes = []string{statBestWpm, statGamesPlayed, statTotalWordsTyped}

	resp, err := service.PublicQueryUserStatItemsShort(params)
	if err != nil {
		return nil, err
	}

	valueOf := func(statCode string) float64 {
		for _, item := range resp.Data {
			if item.StatCode == statCode {
				return item.Value
			}
		}
		return 0
	}

	return &PersonalStats{
		BestWpm:         valueOf(statBestWpm),
		GamesPlayed:     valueOf(statGamesPlayed),
		TotalWordsTyped: valueOf(statTotalWordsTyped),
	}, nil
}
