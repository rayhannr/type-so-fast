package ags

import (
	achievement "github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg/achievementclient/achievements"
	"github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg/achievementclient/user_achievements"
	"github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg/achievementclientmodels"

	"type-so-fast-server/internal/agsconfig"
)

const (
	achievementPerfectionist = "perfectionist"
	achievementModeExplorer  = "mode-explorer"
	achievementTimeTraveler  = "time-traveler"
	achievementPvcFlawless   = "pvc-flawless"
	achievementPvpWin        = "pvp-win"
	achievementPvpFlawless   = "pvp-flawless"
	achievementRoomWin       = "room-win"
	achievementRoomFullHouse = "room-full-house"
)

var pvcWinAchievements = map[string]string{
	"easy":   "pvc-win-easy",
	"medium": "pvc-win-medium",
	"hard":   "pvc-win-hard",
	"legend": "pvc-win-legend",
}

type streakAchievement struct {
	Code   string
	Streak int
}

type winsAchievement struct {
	Code string
	Wins int
}

var pvcStreakAchievements = []streakAchievement{{"pvc-streak-legend-3", 3}, {"pvc-streak-legend-5", 5}}
var pvcWinMilestones = []winsAchievement{{"pvc-wins-10", 10}, {"pvc-wins-50", 50}}
var pvpStreakAchievements = []streakAchievement{{"pvp-streak-3", 3}, {"pvp-streak-5", 5}}
var pvpWinMilestones = []winsAchievement{{"pvp-wins-10", 10}, {"pvp-wins-50", 50}}
var roomStreakAchievements = []streakAchievement{{"room-streak-3", 3}, {"room-streak-5", 5}}
var roomWinMilestones = []winsAchievement{{"room-wins-10", 10}}

type perfectStreakAchievement struct {
	Code  string
	Games int
}

var perfectStreakAchievements = []perfectStreakAchievement{{"perfect-3", 3}, {"perfect-10", 10}}

type dayStreakAchievement struct {
	Code string
	Days int
}

var streakAchievements = []dayStreakAchievement{
	{"streak-7", 7}, {"streak-30", 30}, {"streak-100", 100}, {"streak-250", 250},
	{"streak-365", 365}, {"streak-500", 500}, {"streak-750", 750}, {"streak-1000", 1000},
}

const unlockedStatus = 2

type UnlockedAchievement struct {
	AchievementCode string `json:"achievementCode"`
	Name            string `json:"name"`
}

type AchievementInfo struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Unlocked    bool   `json:"unlocked"`
}

func newAchievementsService(accessToken string) *achievement.AchievementsService {
	configRepo := agsconfig.Player()
	return &achievement.AchievementsService{
		Client:           achievement.NewAchievementClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

func newUserAchievementsService(accessToken string) *achievement.UserAchievementsService {
	configRepo := agsconfig.Player()
	return &achievement.UserAchievementsService{
		Client:           achievement.NewAchievementClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

func GetUnlockedAchievements(userID, accessToken string) ([]UnlockedAchievement, error) {
	service := newUserAchievementsService(accessToken)
	params := user_achievements.NewPublicListUserAchievementsParams()
	params.Namespace = agsconfig.Namespace()
	params.UserID = userID
	preferUnlocked := true
	limit := int64(100)
	params.PreferUnlocked = &preferUnlocked
	params.Limit = &limit

	resp, err := service.PublicListUserAchievementsShort(params)
	if err != nil {
		return nil, err
	}
	return toUnlocked(resp.Data.Data), nil
}

func toUnlocked(items []*achievementclientmodels.ModelsUserAchievementResponse) []UnlockedAchievement {
	out := make([]UnlockedAchievement, 0, len(items))
	for _, item := range items {
		if item.Status == nil || *item.Status != unlockedStatus {
			continue
		}
		code := ""
		if item.AchievementCode != nil {
			code = *item.AchievementCode
		}
		name := code
		if n, ok := item.Name["en"]; ok && n != "" {
			name = n
		}
		out = append(out, UnlockedAchievement{AchievementCode: code, Name: name})
	}
	return out
}

// unlockCodes unlocks each code for the user; one code failing shouldn't block the others.
func unlockCodes(userID, accessToken string, codes []string) {
	if len(codes) == 0 {
		return
	}
	service := newUserAchievementsService(accessToken)
	for _, code := range codes {
		params := user_achievements.NewPublicUnlockAchievementParams()
		params.Namespace = agsconfig.Namespace()
		params.UserID = userID
		params.AchievementCode = code
		_ = service.PublicUnlockAchievementShort(params)
	}
}

func UnlockPerfectionistIfEligible(userID, accessToken string, accuracy float64) {
	if accuracy < 100 {
		return
	}
	unlockCodes(userID, accessToken, []string{achievementPerfectionist})
}

func UnlockStreakAchievementsIfEligible(userID, accessToken string, streak int) {
	var eligible []string
	for _, a := range streakAchievements {
		if streak >= a.Days {
			eligible = append(eligible, a.Code)
		}
	}
	unlockCodes(userID, accessToken, eligible)
}

func UnlockPerfectStreakIfEligible(userID, accessToken string, perfectStreak int) {
	var eligible []string
	for _, a := range perfectStreakAchievements {
		if perfectStreak >= a.Games {
			eligible = append(eligible, a.Code)
		}
	}
	unlockCodes(userID, accessToken, eligible)
}

func UnlockVarietyIfEligible(userID, accessToken string, allModesPlayed, allDurationsPlayed bool) {
	var eligible []string
	if allModesPlayed {
		eligible = append(eligible, achievementModeExplorer)
	}
	if allDurationsPlayed {
		eligible = append(eligible, achievementTimeTraveler)
	}
	unlockCodes(userID, accessToken, eligible)
}

type PvcProgress struct {
	EasyWins        int `json:"easyWins"`
	MediumWins      int `json:"mediumWins"`
	HardWins        int `json:"hardWins"`
	LegendWins      int `json:"legendWins"`
	LegendWinStreak int `json:"legendWinStreak"`
}

func UnlockPvcAchievementsIfEligible(userID, accessToken string, difficulty string, won bool, accuracy float64, progress PvcProgress) {
	if !won {
		return
	}
	totalWins := progress.EasyWins + progress.MediumWins + progress.HardWins + progress.LegendWins
	eligible := []string{pvcWinAchievements[difficulty]}
	if accuracy >= 100 {
		eligible = append(eligible, achievementPvcFlawless)
	}
	for _, a := range pvcStreakAchievements {
		if progress.LegendWinStreak >= a.Streak {
			eligible = append(eligible, a.Code)
		}
	}
	for _, a := range pvcWinMilestones {
		if totalWins >= a.Wins {
			eligible = append(eligible, a.Code)
		}
	}
	unlockCodes(userID, accessToken, eligible)
}

type PvpProgress struct {
	Wins      int `json:"wins"`
	Losses    int `json:"losses"`
	Ties      int `json:"ties"`
	WinStreak int `json:"winStreak"`
}

func UnlockPvpAchievementsIfEligible(userID, accessToken, outcome string, accuracy float64, progress PvpProgress) {
	if outcome != "win" {
		return
	}
	eligible := []string{achievementPvpWin}
	if accuracy >= 100 {
		eligible = append(eligible, achievementPvpFlawless)
	}
	for _, a := range pvpStreakAchievements {
		if progress.WinStreak >= a.Streak {
			eligible = append(eligible, a.Code)
		}
	}
	for _, a := range pvpWinMilestones {
		if progress.Wins >= a.Wins {
			eligible = append(eligible, a.Code)
		}
	}
	unlockCodes(userID, accessToken, eligible)
}

type RoomProgress struct {
	Wins          int `json:"wins"`
	WinStreak     int `json:"winStreak"`
	FullHouseWins int `json:"fullHouseWins"`
}

func UnlockRoomAchievementsIfEligible(userID, accessToken string, won, fullHouse bool, progress RoomProgress) {
	if !won {
		return
	}
	eligible := []string{achievementRoomWin}
	if fullHouse {
		eligible = append(eligible, achievementRoomFullHouse)
	}
	for _, a := range roomStreakAchievements {
		if progress.WinStreak >= a.Streak {
			eligible = append(eligible, a.Code)
		}
	}
	for _, a := range roomWinMilestones {
		if progress.Wins >= a.Wins {
			eligible = append(eligible, a.Code)
		}
	}
	unlockCodes(userID, accessToken, eligible)
}

func GetAchievementList(userID, accessToken string) ([]AchievementInfo, error) {
	achievementsService := newAchievementsService(accessToken)
	catalogParams := achievements.NewPublicListAchievementsParams()
	catalogParams.Namespace = agsconfig.Namespace()
	catalogParams.Language = "en"
	limit := int64(100)
	catalogParams.Limit = &limit

	catalog, err := achievementsService.PublicListAchievementsShort(catalogParams)
	if err != nil {
		return nil, err
	}

	userAchievementsService := newUserAchievementsService(accessToken)
	userParams := user_achievements.NewPublicListUserAchievementsParams()
	userParams.Namespace = agsconfig.Namespace()
	userParams.UserID = userID
	userParams.Limit = &limit

	userAchievements, err := userAchievementsService.PublicListUserAchievementsShort(userParams)
	if err != nil {
		return nil, err
	}

	unlockedCodes := map[string]bool{}
	for _, item := range userAchievements.Data.Data {
		if item.Status != nil && *item.Status == unlockedStatus && item.AchievementCode != nil {
			unlockedCodes[*item.AchievementCode] = true
		}
	}

	list := make([]AchievementInfo, 0, len(catalog.Data.Data))
	for _, a := range catalog.Data.Data {
		code := ""
		if a.AchievementCode != nil {
			code = *a.AchievementCode
		}
		hidden := a.Hidden != nil && *a.Hidden
		if hidden && !unlockedCodes[code] {
			continue
		}
		name := ""
		if a.Name != nil {
			name = *a.Name
		}
		description := ""
		if a.Description != nil {
			description = *a.Description
		}
		list = append(list, AchievementInfo{Code: code, Name: name, Description: description, Unlocked: unlockedCodes[code]})
	}
	return list, nil
}

func DiffNewlyUnlocked(userID, accessToken string, previousCodes []string) ([]UnlockedAchievement, error) {
	previouslyUnlocked := map[string]bool{}
	for _, code := range previousCodes {
		previouslyUnlocked[code] = true
	}

	unlocked, err := GetUnlockedAchievements(userID, accessToken)
	if err != nil {
		return nil, err
	}

	newlyUnlocked := make([]UnlockedAchievement, 0)
	for _, item := range unlocked {
		if !previouslyUnlocked[item.AchievementCode] {
			newlyUnlocked = append(newlyUnlocked, item)
		}
	}
	return newlyUnlocked, nil
}
