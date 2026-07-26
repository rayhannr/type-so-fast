package ags

import (
	"errors"

	basic "github.com/AccelByte/accelbyte-go-modular-sdk/basic-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/basic-sdk/pkg/basicclient/user_profile"
	"github.com/AccelByte/accelbyte-go-modular-sdk/basic-sdk/pkg/basicclientmodels"

	"type-so-fast-server/internal/agsconfig"
)

type Profile struct {
	UserID   string `json:"userId"`
	PublicID string `json:"publicId"`
}

func newUserProfileService(accessToken string) *basic.UserProfileService {
	configRepo := agsconfig.Player()
	return &basic.UserProfileService{
		Client:           basic.NewBasicClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

func getMyProfile(accessToken string) (*Profile, error) {
	service := newUserProfileService(accessToken)
	params := user_profile.NewGetMyProfileInfoParams()
	params.Namespace = agsconfig.Namespace()

	resp, err := service.GetMyProfileInfoShort(params)
	if err != nil {
		return nil, err
	}
	return &Profile{UserID: resp.Data.UserID, PublicID: resp.Data.PublicID}, nil
}

func createProfile(accessToken string) (*Profile, error) {
	service := newUserProfileService(accessToken)
	params := user_profile.NewCreateMyProfileParams()
	params.Namespace = agsconfig.Namespace()
	params.Body = &basicclientmodels.UserProfilePrivateCreate{}

	resp, err := service.CreateMyProfileShort(params)
	if err != nil {
		return nil, err
	}
	return &Profile{UserID: resp.Data.UserID, PublicID: resp.Data.PublicID}, nil
}

// GetOrCreateProfile handles the fact that a fresh Device ID account has no Basic
// profile yet, so a 404 on the first read means "create it".
func GetOrCreateProfile(accessToken string) (*Profile, error) {
	profile, err := getMyProfile(accessToken)
	if err == nil {
		return profile, nil
	}

	var notFound *user_profile.GetMyProfileInfoNotFound
	if errors.As(err, &notFound) {
		return createProfile(accessToken)
	}
	return nil, err
}
