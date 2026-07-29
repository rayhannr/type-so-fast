package ags

import (
	"strings"

	iam "github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg/iamclient/users"
	"github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg/iamclientmodels"
	"github.com/brianvoe/gofakeit/v7"

	"type-so-fast-server/internal/agsconfig"
)

func newUsersService(accessToken string) *iam.UsersService {
	configRepo := agsconfig.Player()
	return &iam.UsersService{
		Client:           iam.NewIamClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

func generateDisplayName() string {
	return capitalize(gofakeit.AdjectiveDescriptive()) + " " + capitalize(gofakeit.Animal())
}

func capitalize(word string) string {
	if word == "" {
		return word
	}
	return strings.ToUpper(word[:1]) + word[1:]
}

// GetOrCreateDisplayName handles the fact that headless Device ID accounts are
// created with an empty IAM uniqueDisplayName, so the first load assigns one.
func GetOrCreateDisplayName(accessToken, localNameHint string) (string, error) {
	service := newUsersService(accessToken)

	getParams := users.NewPublicGetMyUserV3Params()
	resp, err := service.PublicGetMyUserV3Short(getParams)
	if err != nil {
		return "", err
	}
	if resp.Data.UniqueDisplayName != "" {
		return resp.Data.UniqueDisplayName, nil
	}

	uniqueDisplayName := strings.TrimSpace(localNameHint)
	if uniqueDisplayName == "" {
		uniqueDisplayName = generateDisplayName()
	}

	updateParams := users.NewPublicPartialUpdateUserV3Params()
	updateParams.Namespace = agsconfig.Namespace()
	updateParams.Body = &iamclientmodels.ModelPublicUserUpdateRequestV3{UniqueDisplayName: uniqueDisplayName}
	if _, err := service.PublicPartialUpdateUserV3Short(updateParams); err != nil {
		return "", err
	}
	return uniqueDisplayName, nil
}

func UpdateDisplayName(accessToken, displayName string) (string, error) {
	service := newUsersService(accessToken)
	updateParams := users.NewPublicPartialUpdateUserV3Params()
	updateParams.Namespace = agsconfig.Namespace()
	updateParams.Body = &iamclientmodels.ModelPublicUserUpdateRequestV3{UniqueDisplayName: displayName}
	if _, err := service.PublicPartialUpdateUserV3Short(updateParams); err != nil {
		return "", err
	}
	return displayName, nil
}

type UserSummary struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

// GetUserSummaries is a bulk lookup that needs an admin-scoped token, not the requesting
// player's — the public bulk/basic endpoint 404s in this AGS deployment (endpoint not found),
// so this uses the admin bulk-by-userIds endpoint instead, matching the TS SDK's
// UsersAdminApi.createUserBulk_v3.
func GetUserSummaries(userIDs []string) ([]UserSummary, error) {
	if len(userIDs) == 0 {
		return []UserSummary{}, nil
	}

	adminAccessToken, err := GetAdminAccessToken()
	if err != nil {
		return nil, err
	}

	service := newUsersService(adminAccessToken)
	params := users.NewAdminListUserIDByUserIDsV3Params()
	params.Namespace = agsconfig.Namespace()
	params.Body = &iamclientmodels.ModelAdminBulkUserRequest{UserIds: userIDs}

	resp, err := service.AdminListUserIDByUserIDsV3Short(params)
	if err != nil {
		return nil, err
	}

	names := make(map[string]string, len(resp.Data.Data))
	for _, u := range resp.Data.Data {
		if u.UserID == nil {
			continue
		}
		names[*u.UserID] = u.UniqueDisplayName
	}

	summaries := make([]UserSummary, 0, len(userIDs))
	for _, userID := range userIDs {
		displayName := names[userID]
		if displayName == "" {
			displayName = shortUserID(userID)
		}
		summaries = append(summaries, UserSummary{UserID: userID, DisplayName: displayName})
	}
	return summaries, nil
}
