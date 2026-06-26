// Package vokda provides a Go client for the Vokda TTS API.
//
// Two client types:
//   - CatalogClient: public voice catalog (no auth)
//   - Client: authenticated synthesis API (embeds CatalogClient)
//
// Zero external dependencies — uses only net/http and encoding/json.
package vokda

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

const (
	DefaultCatalogURL   = "https://vokda.iksnae.com"
	DefaultSynthesisURL = "https://api.vokda.iksnae.com"
)

// ─── Error ───────────────────────────────────────────────────────────────────

// ApiError represents an error response from the Vokda API.
type ApiError struct {
	StatusCode int
	Body       ErrorBody
}

type ErrorBody struct {
	Error     string   `json:"error"`
	Message   string   `json:"message,omitempty"`
	Supported []string `json:"supported,omitempty"`
}

func (e *ApiError) Error() string {
	msg := e.Body.Message
	if msg == "" {
		msg = e.Body.Error
	}
	return fmt.Sprintf("vokda: API error %d: %s", e.StatusCode, msg)
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Voice struct {
	ID              string                 `json:"id"`
	Name            string                 `json:"name"`
	Provider        string                 `json:"provider"`
	ProviderID      string                 `json:"providerId"`
	ProviderVoiceID string                 `json:"providerVoiceId"`
	Description     string                 `json:"description"`
	Tags            []string               `json:"tags"`
	Languages       []string               `json:"languages"`
	QualityTier     string                 `json:"qualityTier"`
	Gender          string                 `json:"gender,omitempty"`
	ImageURL        string                 `json:"imageUrl,omitempty"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
	ModelCard       map[string]interface{} `json:"modelCard,omitempty"`
	Variants        []json.RawMessage      `json:"variants,omitempty"`
	Samples         []json.RawMessage      `json:"samples,omitempty"`
	Steering        *Steering              `json:"steering,omitempty"`
}

// SteeringSetting is a numeric expressivity control (ElevenLabs voice_settings).
type SteeringSetting struct {
	Key     string  `json:"key"`
	Min     float64 `json:"min"`
	Max     float64 `json:"max"`
	Default float64 `json:"default"`
}

// Steering describes the expressivity control a voice supports and which
// synthesize Options to send. Kind is one of: instructions, styles, settings, none.
type Steering struct {
	Kind           string            `json:"kind"`
	Param          string            `json:"param,omitempty"`
	Hint           string            `json:"hint,omitempty"`
	Options        []string          `json:"options,omitempty"`
	Settings       []SteeringSetting `json:"settings,omitempty"`
	AudioTagsModel string            `json:"audioTagsModel,omitempty"`
}

// Waveform holds precomputed audio peaks (BBC audiowaveform JSON). Data is
// interleaved min/max pairs per pixel in the signed Bits range (8-bit => ±127).
type Waveform struct {
	Version         int   `json:"version"`
	Channels        int   `json:"channels"`
	SampleRate      int   `json:"sample_rate"`
	SamplesPerPixel int   `json:"samples_per_pixel"`
	Bits            int   `json:"bits"`
	Length          int   `json:"length"`
	Data            []int `json:"data"`
}

type VoiceCatalog struct {
	Voices      []Voice `json:"voices"`
	GeneratedAt string  `json:"generatedAt,omitempty"`
}

type Provider struct {
	ID                   string   `json:"id"`
	Name                 string   `json:"name"`
	Type                 string   `json:"type"`
	Description          string   `json:"description"`
	VoiceCount           int      `json:"voiceCount"`
	Languages            []string `json:"languages"`
	LanguageCount        int      `json:"languageCount"`
	SSMLCapable          bool     `json:"ssmlCapable"`
	HasSynthesis         bool     `json:"hasSynthesis"`
	AuthType             string   `json:"authType"`
	PricingSummary       string   `json:"pricingSummary"`
	FreeTier             string   `json:"freeTier"`
	WebsiteURL           string   `json:"websiteUrl"`
	DocsURL              string   `json:"docsUrl"`
	AudioSampleCoverage  string   `json:"audioSampleCoverage"`
}

type ProviderList struct {
	Total       int        `json:"total"`
	GeneratedAt string     `json:"generatedAt"`
	Providers   []Provider `json:"providers"`
}

type CatalogStats struct {
	GeneratedAt    string `json:"generatedAt"`
	TotalVoices    int    `json:"totalVoices"`
	TotalProviders int    `json:"totalProviders"`
	TotalLanguages int    `json:"totalLanguages"`
	WithAudio      int    `json:"withAudio"`
}

type SynthesizeRequest struct {
	Text            string                 `json:"text"`
	Provider        string                 `json:"provider"`
	ProviderVoiceID string                 `json:"providerVoiceId,omitempty"`
	VoiceName       string                 `json:"voiceName,omitempty"`
	VoiceID         string                 `json:"voiceId,omitempty"`
	Mode            string                 `json:"mode,omitempty"`
	// Options carries provider-specific options and steering (e.g.
	// {"instructions": "..."}, {"speakingStyle": "newscaster"}, voice_settings).
	Options map[string]interface{} `json:"options,omitempty"`
}

type SynthesizeResponse struct {
	JobID         string    `json:"jobId"`
	Status        string    `json:"status"`
	AudioURL      string    `json:"audioUrl,omitempty"`
	FileSizeBytes int       `json:"fileSizeBytes,omitempty"`
	DurationMs    *int      `json:"durationMs"`
	LatencyMs     int       `json:"latencyMs,omitempty"`
	Provider      string    `json:"provider,omitempty"`
	VoiceName     string    `json:"voiceName,omitempty"`
	Waveform      *Waveform `json:"waveform,omitempty"`
	CreatedAt     string    `json:"createdAt,omitempty"`
}

type Clip struct {
	JobID           string    `json:"jobId"`
	VoiceID         string    `json:"voiceId"`
	VoiceName       string    `json:"voiceName"`
	Provider        string    `json:"provider"`
	Status          string    `json:"status"`
	InputText       string    `json:"inputText"`
	InputMode       string    `json:"inputMode"`
	ClipName        string    `json:"clipName"`
	ClipDescription string    `json:"clipDescription"`
	ClipTags        []string  `json:"clipTags"`
	AudioURL        string    `json:"audioUrl"`
	FileSizeBytes   int       `json:"fileSizeBytes"`
	LatencyMs       int       `json:"latencyMs"`
	Waveform        *Waveform `json:"waveform,omitempty"`
	CreatedAt       string    `json:"createdAt"`
}

type ClipList struct {
	Jobs  []Clip `json:"jobs"`
	Count int    `json:"count"`
}

type ClipUpdate struct {
	ClipName        *string  `json:"clipName,omitempty"`
	ClipDescription *string  `json:"clipDescription,omitempty"`
	ClipTags        []string `json:"clipTags,omitempty"`
}

type Credential struct {
	ProviderID   string `json:"providerId"`
	Label        string `json:"label"`
	AuthType     string `json:"authType"`
	Status       string `json:"status"`
	MaskedKey    string `json:"maskedKey"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
	LastTestedAt string `json:"lastTestedAt"`
}

type CredentialList struct {
	Credentials []Credential `json:"credentials"`
	Count       int          `json:"count"`
}

type CredentialTestResult struct {
	Success   bool   `json:"success"`
	LatencyMs int    `json:"latencyMs,omitempty"`
	Error     string `json:"error,omitempty"`
}

type ApiKey struct {
	ID        string `json:"id"`
	KeyPrefix string `json:"keyPrefix"`
	Label     string `json:"label"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

type ApiKeyCreated struct {
	ID        string `json:"id"`
	Key       string `json:"key"`
	KeyPrefix string `json:"keyPrefix"`
	Label     string `json:"label"`
	CreatedAt string `json:"createdAt"`
}

type ApiKeyList struct {
	Keys []ApiKey `json:"keys"`
}

type Usage struct {
	TotalBytes     int     `json:"totalBytes"`
	FileCount      int     `json:"fileCount"`
	QuotaBytes     int     `json:"quotaBytes"`
	UsagePercent   float64 `json:"usagePercent"`
	RemainingBytes int     `json:"remainingBytes"`
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

func doRequest(method, reqURL string, body interface{}, headers map[string]string, result interface{}) error {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("vokda: marshal error: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, reqURL, bodyReader)
	if err != nil {
		return fmt.Errorf("vokda: request error: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("vokda: network error: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("vokda: read error: %w", err)
	}

	if resp.StatusCode >= 400 {
		apiErr := &ApiError{StatusCode: resp.StatusCode}
		_ = json.Unmarshal(respBody, &apiErr.Body)
		if apiErr.Body.Error == "" {
			apiErr.Body.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
		return apiErr
	}

	if result != nil {
		return json.Unmarshal(respBody, result)
	}
	return nil
}

// ─── CatalogClient ──────────────────────────────────────────────────────────

// CatalogClient browses the public voice catalog. No authentication required.
type CatalogClient struct {
	BaseURL string
}

// NewCatalogClient creates a catalog client with default settings.
func NewCatalogClient() *CatalogClient {
	return &CatalogClient{BaseURL: DefaultCatalogURL}
}

func (c *CatalogClient) ListVoices() (*VoiceCatalog, error) {
	var result VoiceCatalog
	err := doRequest("GET", c.BaseURL+"/api/v1/voices.json", nil, nil, &result)
	return &result, err
}

func (c *CatalogClient) GetVoice(voiceID string) (*Voice, error) {
	var result Voice
	err := doRequest("GET", c.BaseURL+"/api/v1/voices/"+url.PathEscape(voiceID)+".json", nil, nil, &result)
	return &result, err
}

func (c *CatalogClient) ListProviders() (*ProviderList, error) {
	var result ProviderList
	err := doRequest("GET", c.BaseURL+"/api/v1/providers.json", nil, nil, &result)
	return &result, err
}

func (c *CatalogClient) GetStats() (*CatalogStats, error) {
	var result CatalogStats
	err := doRequest("GET", c.BaseURL+"/api/v1/stats.json", nil, nil, &result)
	return &result, err
}

// ─── Client (authenticated) ─────────────────────────────────────────────────

// Client provides full access to the Vokda API including synthesis.
type Client struct {
	CatalogClient
	SynthesisBaseURL string
	headers          map[string]string
}

// NewClient creates an authenticated client.
func NewClient(apiKey string) *Client {
	return &Client{
		CatalogClient:    CatalogClient{BaseURL: DefaultCatalogURL},
		SynthesisBaseURL: DefaultSynthesisURL,
		headers:          map[string]string{"Authorization": "Bearer " + apiKey},
	}
}

func (c *Client) auth(method, path string, body, result interface{}) error {
	return doRequest(method, c.SynthesisBaseURL+path, body, c.headers, result)
}

// Synthesize generates speech from text or SSML.
func (c *Client) Synthesize(req *SynthesizeRequest) (*SynthesizeResponse, error) {
	var result SynthesizeResponse
	err := c.auth("POST", "/v1/synthesize", req, &result)
	return &result, err
}

func (c *Client) ListClips(limit int) (*ClipList, error) {
	var result ClipList
	err := c.auth("GET", fmt.Sprintf("/v1/jobs?limit=%d", limit), nil, &result)
	return &result, err
}

func (c *Client) GetClip(id string) (*Clip, error) {
	var result Clip
	err := c.auth("GET", "/v1/jobs/"+url.PathEscape(id), nil, &result)
	return &result, err
}

func (c *Client) UpdateClip(id string, update *ClipUpdate) (*Clip, error) {
	var result Clip
	err := c.auth("PATCH", "/v1/jobs/"+url.PathEscape(id), update, &result)
	return &result, err
}

func (c *Client) DeleteClip(id string) error {
	return c.auth("DELETE", "/v1/jobs/"+url.PathEscape(id), nil, nil)
}

func (c *Client) SaveCredential(providerID string, credentialData map[string]string, label string) error {
	body := map[string]interface{}{
		"providerId":     providerID,
		"credentialData": credentialData,
	}
	if label != "" {
		body["label"] = label
	}
	return c.auth("POST", "/v1/credentials", body, nil)
}

func (c *Client) ListCredentials() (*CredentialList, error) {
	var result CredentialList
	err := c.auth("GET", "/v1/credentials", nil, &result)
	return &result, err
}

func (c *Client) TestCredential(providerID string, credentialData map[string]string) (*CredentialTestResult, error) {
	var result CredentialTestResult
	body := map[string]interface{}{
		"providerId":     providerID,
		"credentialData": credentialData,
	}
	err := c.auth("POST", "/v1/credentials/test", body, &result)
	return &result, err
}

func (c *Client) DeleteCredential(providerID string) error {
	return c.auth("DELETE", "/v1/credentials/"+url.PathEscape(providerID), nil, nil)
}

func (c *Client) CreateApiKey(label string) (*ApiKeyCreated, error) {
	var result ApiKeyCreated
	body := map[string]string{}
	if label != "" {
		body["label"] = label
	}
	err := c.auth("POST", "/v1/keys", body, &result)
	return &result, err
}

func (c *Client) ListApiKeys() (*ApiKeyList, error) {
	var result ApiKeyList
	err := c.auth("GET", "/v1/keys", nil, &result)
	return &result, err
}

func (c *Client) RevokeApiKey(id string) error {
	return c.auth("DELETE", "/v1/keys/"+url.PathEscape(id), nil, nil)
}

func (c *Client) GetUsage() (*Usage, error) {
	var result Usage
	err := c.auth("GET", "/v1/media/usage", nil, &result)
	return &result, err
}
