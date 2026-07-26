package ags

import (
	"errors"
	"sync"
	"time"

	iam "github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/iam-sdk/pkg/iamclient/o_auth2_0"

	"type-so-fast-server/internal/agsconfig"
)

// mutex-guarded since Cloud Run can serve concurrent requests on the same instance.
var (
	adminTokenMu sync.Mutex
	cachedToken  string
	cachedExpiry time.Time
)

// GetAdminAccessToken returns a cached client_credentials token for server-only admin calls
// (e.g. bulk user lookup), refreshing it once expired.
func GetAdminAccessToken() (string, error) {
	adminTokenMu.Lock()
	defer adminTokenMu.Unlock()

	if cachedToken != "" && time.Now().Before(cachedExpiry) {
		return cachedToken, nil
	}

	configRepo := agsconfig.Admin()
	oauthService := &iam.OAuth20Service{
		Client:           iam.NewIamClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(""),
	}

	grantType := o_auth2_0.TokenGrantV3GrantTypeClientCredentialsConstant
	params := o_auth2_0.NewTokenGrantV3Params()
	params.GrantType = grantType

	resp, err := oauthService.TokenGrantV3Short(params)
	if err != nil {
		return "", err
	}
	if resp.Data == nil || resp.Data.AccessToken == nil {
		return "", errors.New("admin token grant returned no access token")
	}

	expiresIn := int32(3600)
	if resp.Data.ExpiresIn != nil {
		expiresIn = *resp.Data.ExpiresIn
	}

	cachedToken = *resp.Data.AccessToken
	cachedExpiry = time.Now().Add(time.Duration(expiresIn-60) * time.Second)

	return cachedToken, nil
}
