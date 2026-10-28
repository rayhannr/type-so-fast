package ags

import (
	"errors"

	iam "github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg/iamclient/o_auth2_0"
	"github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg/iamclient/users"

	"type-so-fast-server/internal/agsconfig"
)

type Session struct {
	UserID       string `json:"userId"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	LobbyURL     string `json:"lobbyUrl"`
}

type LinkedAccount struct {
	DisplayName  *string `json:"displayName"`
	EmailAddress *string `json:"emailAddress"`
}

func newOAuth20Service() *iam.OAuth20Service {
	configRepo := agsconfig.Player()
	return &iam.OAuth20Service{
		Client:           iam.NewIamClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(""),
	}
}

func loginWithPlatformToken(platformID string, configure func(*o_auth2_0.PlatformTokenGrantV3Params)) (*Session, error) {
	params := o_auth2_0.NewPlatformTokenGrantV3Params()
	params.PlatformID = platformID
	configure(params)

	resp, err := newOAuth20Service().PlatformTokenGrantV3Short(params)
	if err != nil {
		return nil, err
	}
	refreshToken := ""
	if resp.Data.RefreshToken != nil {
		refreshToken = *resp.Data.RefreshToken
	}
	return &Session{
		UserID:       *resp.Data.UserID,
		AccessToken:  *resp.Data.AccessToken,
		RefreshToken: refreshToken,
		LobbyURL:     agsconfig.LobbyURL(),
	}, nil
}

func RefreshSession(refreshToken string) (*Session, error) {
	params := o_auth2_0.NewTokenGrantV3Params()
	params.GrantType = o_auth2_0.TokenGrantV3GrantTypeRefreshTokenConstant
	params.RefreshToken = &refreshToken

	resp, err := newOAuth20Service().TokenGrantV3Short(params)
	if err != nil {
		return nil, err
	}
	return &Session{
		UserID:       resp.Data.UserID,
		AccessToken:  *resp.Data.AccessToken,
		RefreshToken: resp.Data.RefreshToken,
		LobbyURL:     agsconfig.LobbyURL(),
	}, nil
}

func LoginWithDeviceID(deviceID string) (*Session, error) {
	return loginWithPlatformToken("device", func(p *o_auth2_0.PlatformTokenGrantV3Params) {
		p.DeviceID = &deviceID
	})
}

// ErrGoogleNotLinked means no AGS user owns this Google account yet
var ErrGoogleNotLinked = errors.New("platform_not_linked")

func LoginWithGoogle(googleIDToken string) (*Session, error) {
	createHeadless := false
	session, err := loginWithPlatformToken("google", func(p *o_auth2_0.PlatformTokenGrantV3Params) {
		p.PlatformToken = &googleIDToken
		p.CreateHeadless = &createHeadless
	})
	var unauthorized *o_auth2_0.PlatformTokenGrantV3Unauthorized
	if errors.As(err, &unauthorized) && unauthorized.Payload != nil && unauthorized.Payload.Error != nil && *unauthorized.Payload.Error == "platform_not_linked" {
		return nil, ErrGoogleNotLinked
	}
	return session, err
}

func LinkGoogleAccount(accessToken, googleIDToken string) error {
	params := users.NewPublicPlatformLinkV3Params()
	params.Namespace = agsconfig.Namespace()
	params.PlatformID = "google"
	params.Ticket = googleIDToken

	return newUsersService(accessToken).PublicPlatformLinkV3Short(params)
}

func UnlinkGoogleAccount(accessToken string) error {
	params := users.NewPublicPlatformUnlinkV3Params()
	params.Namespace = agsconfig.Namespace()
	params.PlatformID = "google"

	return newUsersService(accessToken).PublicPlatformUnlinkV3Short(params)
}

func GetLinkedGoogleAccount(userID, accessToken string) (*LinkedAccount, error) {
	params := users.NewPublicGetUserPlatformAccountsV3Params()
	params.Namespace = agsconfig.Namespace()
	params.UserID = userID

	resp, err := newUsersService(accessToken).PublicGetUserPlatformAccountsV3Short(params)
	if err != nil {
		return nil, err
	}

	for _, platform := range resp.Data.Data {
		if platform.PlatformID == "google" {
			displayName := platform.DisplayName
			emailAddress := platform.EmailAddress
			return &LinkedAccount{DisplayName: &displayName, EmailAddress: &emailAddress}, nil
		}
	}
	return nil, nil
}
