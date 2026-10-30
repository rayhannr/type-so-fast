package ags

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	achievement "github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg/achievementclient/achievements"
	"github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg/achievementclient/global_achievements"
	"github.com/AccelByte/accelbyte-go-modular-sdk/achievement-sdk/pkg/achievementclientmodels"

	"type-so-fast-server/internal/agsconfig"
	"type-so-fast-server/internal/agserror"
)

const topContributorsLimit = 5

type Contributor struct {
	UserID           string  `json:"userId"`
	DisplayName      string  `json:"displayName"`
	ContributedValue float64 `json:"contributedValue"`
}

type GlobalAchievement struct {
	Code            string        `json:"code"`
	Name            string        `json:"name"`
	Description     string        `json:"description"`
	LockedIconURL   string        `json:"lockedIconUrl"`
	UnlockedIconURL string        `json:"unlockedIconUrl"`
	GoalValue       float64       `json:"goalValue"`
	LatestValue     float64       `json:"latestValue"`
	Achieved        bool          `json:"achieved"`
	MyContribution  float64       `json:"myContribution"`
	CanClaimReward  bool          `json:"canClaimReward"`
	TopContributors []Contributor `json:"topContributors"`
}

func firstIconURL(icons []*achievementclientmodels.ModelsIcon) string {
	for _, icon := range icons {
		if icon != nil && icon.URL != nil && *icon.URL != "" {
			return *icon.URL
		}
	}
	return ""
}

func newGlobalAchievementsService(accessToken string) *achievement.GlobalAchievementsService {
	configRepo := agsconfig.Player()
	return &achievement.GlobalAchievementsService{
		Client:           achievement.NewAchievementClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

// GetGlobalAchievements merges three AGS reads per community goal: the catalog (name, goal),
// the shared progress (AGS only creates that record on the first contribution, so a missing
// one means 0), and the contributions, both the requesting player's and the top contributors.
func GetGlobalAchievements(userID, accessToken string) ([]GlobalAchievement, error) {
	namespace := agsconfig.Namespace()
	limit := int64(100)

	catalogParams := achievements.NewPublicListAchievementsParams()
	catalogParams.Namespace = namespace
	catalogParams.Language = "en"
	catalogParams.Limit = &limit
	catalog, err := newAchievementsService(accessToken).PublicListAchievementsShort(catalogParams)
	if err != nil {
		return nil, err
	}

	list := []GlobalAchievement{}
	codes := []string{}
	for _, a := range catalog.Data.Data {
		if a.Global == nil || !*a.Global || a.AchievementCode == nil {
			continue
		}
		item := GlobalAchievement{Code: *a.AchievementCode, GoalValue: a.GoalValue, TopContributors: []Contributor{}}
		if a.Name != nil {
			item.Name = *a.Name
		}
		if a.Description != nil {
			item.Description = *a.Description
		}
		item.LockedIconURL = firstIconURL(a.LockedIcons)
		item.UnlockedIconURL = firstIconURL(a.UnlockedIcons)
		list = append(list, item)
		codes = append(codes, item.Code)
	}
	if len(list) == 0 {
		return list, nil
	}

	service := newGlobalAchievementsService(accessToken)
	joinedCodes := strings.Join(codes, ",")

	progressParams := global_achievements.NewPublicListGlobalAchievementsParams()
	progressParams.Namespace = namespace
	progressParams.AchievementCodes = &joinedCodes
	progressParams.Limit = &limit
	progress, err := service.PublicListGlobalAchievementsShort(progressParams)
	if err != nil {
		return nil, err
	}

	contributionParams := global_achievements.NewListUserContributionsParams()
	contributionParams.Namespace = namespace
	contributionParams.UserID = userID
	contributionParams.AchievementCodes = &joinedCodes
	contributionParams.Limit = &limit
	contributions, err := service.ListUserContributionsShort(contributionParams)
	if err != nil {
		return nil, err
	}

	contributorIDs := []string{}
	seenContributors := map[string]bool{}
	for i := range list {
		item := &list[i]
		for _, p := range progress.Data.Data {
			if p.AchievementCode == nil || *p.AchievementCode != item.Code {
				continue
			}
			if p.LatestValue != nil {
				item.LatestValue = *p.LatestValue
			}
			item.Achieved = p.Status != nil && *p.Status == unlockedStatus
		}
		for _, c := range contributions.Data.Data {
			if c.AchievementCode == nil || *c.AchievementCode != item.Code {
				continue
			}
			if c.ContributedValue != nil {
				item.MyContribution = *c.ContributedValue
			}
			item.CanClaimReward = c.CanClaimReward != nil && *c.CanClaimReward
		}

		contributorLimit := int64(topContributorsLimit)
		sortBy := global_achievements.ListGlobalAchievementContributorsSortByContributedValueDescConstant
		contributorParams := global_achievements.NewListGlobalAchievementContributorsParams()
		contributorParams.Namespace = namespace
		contributorParams.AchievementCode = item.Code
		contributorParams.Limit = &contributorLimit
		contributorParams.SortBy = &sortBy
		contributors, err := service.ListGlobalAchievementContributorsShort(contributorParams)
		if err != nil {
			return nil, err
		}
		for _, c := range contributors.Data.Data {
			if c.UserID == nil {
				continue
			}
			contributor := Contributor{UserID: *c.UserID}
			if c.ContributedValue != nil {
				contributor.ContributedValue = *c.ContributedValue
			}
			item.TopContributors = append(item.TopContributors, contributor)
			if !seenContributors[*c.UserID] {
				seenContributors[*c.UserID] = true
				contributorIDs = append(contributorIDs, *c.UserID)
			}
		}
	}

	summaries, err := GetUserSummaries(contributorIDs)
	if err != nil {
		return nil, err
	}
	names := make(map[string]string, len(summaries))
	for _, s := range summaries {
		names[s.UserID] = s.DisplayName
	}
	for i := range list {
		for j := range list[i].TopContributors {
			list[i].TopContributors[j].DisplayName = names[list[i].TopContributors[j].UserID]
		}
	}
	return list, nil
}

// ClaimGlobalAchievementReward only marks the claim, the badge itself is granted by the AGS
// reward config listening for the achievementRewardClaimed event this claim emits.
//
// The generated achievement-sdk claim reader has no 404 case, so AGS's 404s (40245 nothing to
// claim yet, 40344 not a contributor) come back as an opaque error string. The documented public
// claim endpoint is called directly so every AGS error code reaches the frontend.
func ClaimGlobalAchievementReward(userID, accessToken, achievementCode string) error {
	endpoint := fmt.Sprintf("%s/achievement/v1/public/namespaces/%s/users/%s/global/achievements/%s/claim",
		agsconfig.Player().BaseURL, agsconfig.Namespace(), url.PathEscape(userID), url.PathEscape(achievementCode))
	req, err := http.NewRequest(http.MethodPost, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		detail := &agserror.Detail{Status: resp.StatusCode}
		var payload struct {
			ErrorCode    int32  `json:"errorCode"`
			ErrorMessage string `json:"errorMessage"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&payload); err == nil {
			detail.ErrorCode = payload.ErrorCode
			detail.ErrorMessage = payload.ErrorMessage
		}
		return detail
	}
	expireCommunityBadgeOwners()
	return nil
}
