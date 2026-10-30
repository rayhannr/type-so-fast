package ags

import (
	"github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg/achievementclient/global_achievements"
	"github.com/AccelByte/accelbyte-go-modular-sdk/social-sdk/pkg/socialclient/user_statistic"
	"github.com/AccelByte/accelbyte-go-modular-sdk/social-sdk/pkg/socialclientmodels"

	"type-so-fast-server/internal/agsconfig"
)

// The "Ten Thousand Together" community event: a global achievement on its own global stat.
// AGS keeps adding contributors to a global achievement after its goal is reached, so the event
// stat is server-only (setBy SERVER) and this server stops writing it once the goal is reached,
// which leaves the badge claimable only by players who helped reach it.
const (
	eventAchievementCode = "ten-thousand-together"
	statEventWords       = "event-words-ten-thousand"
)

func isEventOpen(accessToken string) (bool, error) {
	code := eventAchievementCode
	params := global_achievements.NewPublicListGlobalAchievementsParams()
	params.Namespace = agsconfig.Namespace()
	params.AchievementCodes = &code
	resp, err := newGlobalAchievementsService(accessToken).PublicListGlobalAchievementsShort(params)
	if err != nil {
		return false, err
	}
	// no progress record yet means nobody has contributed, so the goal can't be reached
	for _, p := range resp.Data.Data {
		if p.AchievementCode != nil && *p.AchievementCode == eventAchievementCode && p.Status != nil && *p.Status == unlockedStatus {
			return false, nil
		}
	}
	return true, nil
}

func contributeToEvent(userID, accessToken string, wordsTyped float64) error {
	if wordsTyped <= 0 {
		return nil
	}
	open, err := isEventOpen(accessToken)
	if err != nil || !open {
		return err
	}

	adminAccessToken, err := GetAdminAccessToken()
	if err != nil {
		return err
	}
	strategy := "INCREMENT"
	params := user_statistic.NewUpdateUserStatItemValueParams()
	params.Namespace = agsconfig.Namespace()
	params.UserID = userID
	params.StatCode = statEventWords
	params.Body = &socialclientmodels.StatItemUpdate{UpdateStrategy: &strategy, Value: &wordsTyped}
	_, err = newUserStatisticService(adminAccessToken).UpdateUserStatItemValueShort(params)
	return err
}
