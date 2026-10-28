package ags

import (
	"errors"

	iam "github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg/iamclient/o_auth2_0"
	"github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg/iamclient/users"
	"github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg/iamclientmodels"

	"type-so-fast-server/internal/agsconfig"
	"type-so-fast-server/internal/agserror"
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

func LoginWithGoogle(googleIDToken string) (*Session, error) {
	return loginWithPlatformToken("google", func(p *o_auth2_0.PlatformTokenGrantV3Params) {
		p.PlatformToken = &googleIDToken
	})
}

func LinkGoogleAccount(accessToken, googleIDToken string) error {
	params := users.NewPublicPlatformLinkV3Params()
	params.Namespace = agsconfig.Namespace()
	params.PlatformID = "google"
	params.Ticket = googleIDToken

	// passes AGS's errorCode through so the frontend can tell "Google already linked to another
	// user" (10173) apart and sign in to that user instead
	err := newUsersService(accessToken).PublicPlatformLinkV3Short(params)
	var conflict *users.PublicPlatformLinkV3Conflict
	if errors.As(err, &conflict) {
		return restErrorDetail(409, conflict.Payload)
	}
	var badRequest *users.PublicPlatformLinkV3BadRequest
	if errors.As(err, &badRequest) {
		return restErrorDetail(400, badRequest.Payload)
	}
	return err
}

func restErrorDetail(status int, payload *iamclientmodels.RestErrorResponse) *agserror.Detail {
	detail := &agserror.Detail{Status: status}
	if payload == nil {
		return detail
	}
	if payload.ErrorCode != nil {
		detail.ErrorCode = *payload.ErrorCode
	}
	if payload.ErrorMessage != nil {
		detail.ErrorMessage = *payload.ErrorMessage
	}
	return detail
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
