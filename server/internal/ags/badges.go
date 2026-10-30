package ags

import (
	"errors"
	"sync"
	"time"

	platform "github.com/AccelByte/accelbyte-go-modular-sdk/platform-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/platform-sdk/pkg/platformclient/entitlement"
	"github.com/AccelByte/accelbyte-go-modular-sdk/platform-sdk/pkg/platformclient/item"

	"type-so-fast-server/internal/agsconfig"
)

const (
	// the item the AGS reward config grants when a player claims eventAchievementCode
	communityBadgeSku    = "badge-ten-thousand-together"
	badgeOwnersTTL       = time.Minute
	badgeOwnersPageLimit = int32(100)
)

// mutex-guarded since Cloud Run can serve concurrent requests on the same instance.
var (
	badgeMu           sync.Mutex
	badgeItemID       string
	badgeOwners       []string
	badgeOwnersExpiry time.Time
)

func expireCommunityBadgeOwners() {
	badgeMu.Lock()
	defer badgeMu.Unlock()
	badgeOwnersExpiry = time.Time{}
}

// GetCommunityBadgeOwners lists every player holding the community badge. Other players'
// entitlements are admin-only, so this runs on the admin token, and it's cached briefly since
// the leaderboard and room screens ask for it on every load.
func GetCommunityBadgeOwners() ([]string, error) {
	badgeMu.Lock()
	defer badgeMu.Unlock()

	if badgeOwners != nil && time.Now().Round(0).Before(badgeOwnersExpiry) {
		return badgeOwners, nil
	}

	adminAccessToken, err := GetAdminAccessToken()
	if err != nil {
		return nil, err
	}
	configRepo := agsconfig.Admin()
	client := platform.NewPlatformClient(configRepo)
	tokenRepo := agsconfig.NewStaticTokenRepository(adminAccessToken)

	if badgeItemID == "" {
		itemService := &platform.ItemService{Client: client, ConfigRepository: configRepo, TokenRepository: tokenRepo}
		itemParams := item.NewPublicGetItemBySkuParams()
		itemParams.Namespace = agsconfig.Namespace()
		itemParams.Sku = communityBadgeSku
		resp, err := itemService.PublicGetItemBySkuShort(itemParams)
		if err != nil {
			return nil, err
		}
		if resp.Data == nil || resp.Data.ItemID == nil {
			return nil, errors.New("community badge item has no item ID")
		}
		badgeItemID = *resp.Data.ItemID
	}

	entitlementService := &platform.EntitlementService{Client: client, ConfigRepository: configRepo, TokenRepository: tokenRepo}
	activeOnly := true
	limit := badgeOwnersPageLimit
	owners := []string{}
	seen := map[string]bool{}
	for offset := int32(0); ; offset += limit {
		params := entitlement.NewQueryEntitlementsByItemIdsParams()
		params.Namespace = agsconfig.Namespace()
		params.ItemIds = []string{badgeItemID}
		params.ActiveOnly = &activeOnly
		params.Limit = &limit
		params.Offset = &offset
		resp, err := entitlementService.QueryEntitlementsByItemIdsShort(params)
		if err != nil {
			return nil, err
		}
		for _, e := range resp.Data.Data {
			if e.UserID != "" && !seen[e.UserID] {
				seen[e.UserID] = true
				owners = append(owners, e.UserID)
			}
		}
		if int32(len(resp.Data.Data)) < limit {
			break
		}
	}

	badgeOwners = owners
	badgeOwnersExpiry = time.Now().Round(0).Add(badgeOwnersTTL)
	return badgeOwners, nil
}
