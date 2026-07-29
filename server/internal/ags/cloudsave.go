package ags

import (
	"encoding/json"

	cloudsave "github.com/AccelByte/accelbyte-go-modular-sdk/cloudsave-sdk/pkg"
	"github.com/AccelByte/accelbyte-go-modular-sdk/cloudsave-sdk/pkg/cloudsaveclient/public_player_record"

	"type-so-fast-server/internal/agsconfig"
)

// toFloat64 handles the fact that the cloudsave SDK decodes each record's Value using
// json.Number (via UseNumber), not float64 — the JSON on the wire is a genuine number either way.
func toFloat64(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case json.Number:
		f, err := n.Float64()
		return f, err == nil
	default:
		return 0, false
	}
}

const (
	recordsKey     = "bestRecords"
	historyKey     = "gameHistory"
	streakKey      = "dailyStreak"
	settingsKey    = "settings"
	progressionKey = "progression"
	pvcKey         = "pvcProgress"
	pvpKey         = "pvpProgress"
	roomKey        = "roomProgress"
)

func newPlayerRecordService(accessToken string) *cloudsave.PublicPlayerRecordService {
	configRepo := agsconfig.Player()
	return &cloudsave.PublicPlayerRecordService{
		Client:           cloudsave.NewCloudsaveClient(configRepo),
		ConfigRepository: configRepo,
		TokenRepository:  agsconfig.NewStaticTokenRepository(accessToken),
	}
}

func getPlayerRecord(userID, accessToken, key string) (interface{}, error) {
	service := newPlayerRecordService(accessToken)
	params := public_player_record.NewGetPlayerRecordHandlerV1Params()
	params.Namespace = agsconfig.Namespace()
	params.UserID = userID
	params.Key = key

	resp, err := service.GetPlayerRecordHandlerV1Short(params)
	if err != nil {
		return nil, err
	}
	return resp.Data.Value, nil
}

func savePlayerRecord(userID, accessToken, key string, value interface{}) error {
	service := newPlayerRecordService(accessToken)
	params := public_player_record.NewPutPlayerRecordHandlerV1Params()
	params.Namespace = agsconfig.Namespace()
	params.UserID = userID
	params.Key = key
	params.Body = value

	_, err := service.PutPlayerRecordHandlerV1Short(params)
	return err
}

func GetBestRecords(userID, accessToken string) ([]float64, error) {
	value, err := getPlayerRecord(userID, accessToken, recordsKey)
	if err != nil {
		return []float64{}, nil
	}
	m, ok := value.(map[string]interface{})
	if !ok {
		return []float64{}, nil
	}
	records, ok := m["records"].([]interface{})
	if !ok {
		return []float64{}, nil
	}
	out := make([]float64, 0, len(records))
	for _, r := range records {
		if f, ok := toFloat64(r); ok {
			out = append(out, f)
		}
	}
	return out, nil
}

func SaveBestRecords(userID, accessToken string, records []float64) error {
	return savePlayerRecord(userID, accessToken, recordsKey, map[string]interface{}{"records": records})
}

func GetGameHistory(userID, accessToken string) ([]interface{}, error) {
	value, err := getPlayerRecord(userID, accessToken, historyKey)
	if err != nil {
		return []interface{}{}, nil
	}
	m, ok := value.(map[string]interface{})
	if !ok {
		return []interface{}{}, nil
	}
	entries, ok := m["entries"].([]interface{})
	if !ok {
		return []interface{}{}, nil
	}
	return entries, nil
}

func SaveGameHistory(userID, accessToken string, entries interface{}) error {
	return savePlayerRecord(userID, accessToken, historyKey, map[string]interface{}{"entries": entries})
}

func GetStreak(userID, accessToken string) (interface{}, error) {
	value, err := getPlayerRecord(userID, accessToken, streakKey)
	if err != nil {
		return nil, nil
	}
	m, ok := value.(map[string]interface{})
	if !ok {
		return nil, nil
	}
	if _, ok := m["lastPlayedDate"]; !ok {
		return nil, nil
	}
	return m, nil
}

func SaveStreak(userID, accessToken string, streak interface{}) error {
	return savePlayerRecord(userID, accessToken, streakKey, streak)
}

func GetProgression(userID, accessToken string) (interface{}, error) {
	value, err := getPlayerRecord(userID, accessToken, progressionKey)
	if err != nil {
		return nil, nil
	}
	m, ok := value.(map[string]interface{})
	if !ok {
		return nil, nil
	}
	if _, ok := toFloat64(m["xp"]); !ok {
		return nil, nil
	}
	return m, nil
}

func SaveProgression(userID, accessToken string, progression interface{}) error {
	return savePlayerRecord(userID, accessToken, progressionKey, progression)
}

func GetPvcProgress(userID, accessToken string) (interface{}, error) {
	value, err := getPlayerRecord(userID, accessToken, pvcKey)
	if err != nil {
		return nil, nil
	}
	m, ok := value.(map[string]interface{})
	if !ok {
		return nil, nil
	}
	if _, ok := toFloat64(m["legendWinStreak"]); !ok {
		return nil, nil
	}
	return m, nil
}

func SavePvcProgress(userID, accessToken string, pvc interface{}) error {
	return savePlayerRecord(userID, accessToken, pvcKey, pvc)
}

func GetPvpProgress(userID, accessToken string) (interface{}, error) {
	value, err := getPlayerRecord(userID, accessToken, pvpKey)
	if err != nil {
		return nil, nil
	}
	m, ok := value.(map[string]interface{})
	if !ok {
		return nil, nil
	}
	if _, ok := toFloat64(m["winStreak"]); !ok {
		return nil, nil
	}
	return m, nil
}

func SavePvpProgress(userID, accessToken string, pvp interface{}) error {
	return savePlayerRecord(userID, accessToken, pvpKey, pvp)
}

func GetRoomProgress(userID, accessToken string) (interface{}, error) {
	value, err := getPlayerRecord(userID, accessToken, roomKey)
	if err != nil {
		return nil, nil
	}
	m, ok := value.(map[string]interface{})
	if !ok {
		return nil, nil
	}
	if _, ok := toFloat64(m["winStreak"]); !ok {
		return nil, nil
	}
	return m, nil
}

func SaveRoomProgress(userID, accessToken string, room interface{}) error {
	return savePlayerRecord(userID, accessToken, roomKey, room)
}

func GetSettings(userID, accessToken string) (interface{}, error) {
	value, err := getPlayerRecord(userID, accessToken, settingsKey)
	if err != nil {
		return map[string]interface{}{}, nil
	}
	m, ok := value.(map[string]interface{})
	if !ok {
		return map[string]interface{}{}, nil
	}
	return m, nil
}

func SaveSettings(userID, accessToken string, settings interface{}) error {
	return savePlayerRecord(userID, accessToken, settingsKey, settings)
}
