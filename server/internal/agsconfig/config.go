package agsconfig

import (
	"os"
	"time"

	"github.com/AccelByte/accelbyte-go-modular-sdk/services-api/pkg/repository"
)

// Repository implements repository.ConfigRepository against env vars.
type Repository struct {
	ClientID     string
	ClientSecret string
	BaseURL      string
}

func (r *Repository) GetClientId() string      { return r.ClientID }
func (r *Repository) GetClientSecret() string  { return r.ClientSecret }
func (r *Repository) GetJusticeBaseUrl() string { return r.BaseURL }

// Player is the config repository used for player-scoped (bearer) calls — no client secret,
// since the frontend's Device ID login flow uses a public client.
func Player() *Repository {
	return &Repository{
		ClientID: os.Getenv("ACCELBYTE_CLIENT_ID"),
		BaseURL:  os.Getenv("ACCELBYTE_BASE_URL"),
	}
}

// Admin is the confidential-client config repository used only to grant an admin
// client_credentials token.
func Admin() *Repository {
	return &Repository{
		ClientID:     os.Getenv("ACCELBYTE_ADMIN_CLIENT_ID"),
		ClientSecret: os.Getenv("ACCELBYTE_ADMIN_CLIENT_SECRET"),
		BaseURL:      os.Getenv("ACCELBYTE_BASE_URL"),
	}
}

func Namespace() string {
	return os.Getenv("ACCELBYTE_NAMESPACE")
}

// StaticTokenRepository is a repository.TokenRepository over a fixed, already-issued access
// token — the Go service never performs its own login, it only forwards tokens the frontend
// already obtained (or an admin token minted by adminToken.go).
type StaticTokenRepository struct {
	AccessToken string
	IssuedAt    time.Time
}

func NewStaticTokenRepository(accessToken string) *StaticTokenRepository {
	return &StaticTokenRepository{AccessToken: accessToken, IssuedAt: time.Now()}
}

func (t *StaticTokenRepository) Store(_ interface{}) error { return nil }

func (t *StaticTokenRepository) GetToken() (*repository.Token, error) {
	token := t.AccessToken
	return &repository.Token{AccessToken: &token}, nil
}

func (t *StaticTokenRepository) RemoveToken() error { return nil }

func (t *StaticTokenRepository) TokenIssuedTimeUTC() time.Time { return t.IssuedAt }
