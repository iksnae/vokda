//! Vokda API types — derived from OpenAPI 3.1 spec.

use serde::{Deserialize, Serialize};

// ─── Catalog ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Voice {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub provider_id: String,
    pub provider_voice_id: String,
    pub description: String,
    pub tags: Vec<String>,
    pub languages: Vec<String>,
    pub quality_tier: String,
    #[serde(default)]
    pub gender: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
    #[serde(default)]
    pub model_card: Option<serde_json::Value>,
    #[serde(default)]
    pub variants: Vec<serde_json::Value>,
    #[serde(default)]
    pub samples: Vec<serde_json::Value>,
    /// Expressivity control this voice supports (and which `options.*` to send).
    #[serde(default)]
    pub steering: Option<Steering>,
}

/// A numeric expressivity control (ElevenLabs voice_settings).
#[derive(Debug, Clone, Deserialize)]
pub struct SteeringSetting {
    pub key: String,
    pub min: f64,
    pub max: f64,
    pub default: f64,
}

/// Expressivity control a voice supports. `kind` is one of
/// `instructions` | `styles` | `settings` | `none`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Steering {
    pub kind: String,
    #[serde(default)]
    pub param: Option<String>,
    #[serde(default)]
    pub hint: Option<String>,
    #[serde(default)]
    pub options: Option<Vec<String>>,
    #[serde(default)]
    pub settings: Option<Vec<SteeringSetting>>,
    #[serde(default)]
    pub audio_tags_model: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceCatalog {
    pub voices: Vec<Voice>,
    #[serde(default)]
    pub generated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub provider_type: String,
    pub description: Option<String>,
    pub voice_count: u32,
    pub languages: Vec<String>,
    pub language_count: u32,
    pub ssml_capable: bool,
    pub has_synthesis: bool,
    pub auth_type: String,
    pub pricing_summary: Option<String>,
    pub free_tier: Option<String>,
    pub website_url: Option<String>,
    pub docs_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderList {
    pub total: u32,
    pub generated_at: String,
    pub providers: Vec<Provider>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogStats {
    pub generated_at: String,
    pub total_voices: u32,
    pub total_providers: u32,
    pub total_languages: u32,
    pub with_audio: u32,
}

// ─── Synthesis ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesizeRequest {
    pub text: String,
    pub provider: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_voice_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
    /// Provider-specific options and steering (e.g. `{"instructions": "..."}`,
    /// `{"speakingStyle": "newscaster"}`, or ElevenLabs voice_settings).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<serde_json::Value>,
}

/// Precomputed audio peaks (BBC audiowaveform JSON). `data` is interleaved
/// min/max pairs per pixel in the signed `bits` range (8-bit => ±127). Keys are
/// snake_case on the wire, so no rename here.
#[derive(Debug, Clone, Deserialize)]
pub struct Waveform {
    pub version: i64,
    pub channels: i64,
    pub sample_rate: i64,
    pub samples_per_pixel: i64,
    pub bits: i64,
    pub length: i64,
    pub data: Vec<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesizeResponse {
    pub job_id: String,
    pub status: String,
    pub audio_url: Option<String>,
    pub file_size_bytes: Option<u64>,
    pub duration_ms: Option<u64>,
    pub latency_ms: Option<u64>,
    pub provider: Option<String>,
    pub voice_name: Option<String>,
    #[serde(default)]
    pub waveform: Option<Waveform>,
    pub created_at: Option<String>,
}

// ─── Clips ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Clip {
    pub job_id: String,
    pub voice_id: String,
    pub voice_name: Option<String>,
    pub provider: String,
    pub status: String,
    pub input_text: String,
    pub input_mode: String,
    pub clip_name: Option<String>,
    pub clip_description: Option<String>,
    #[serde(default)]
    pub clip_tags: Vec<String>,
    pub audio_url: Option<String>,
    pub file_size_bytes: Option<u64>,
    pub latency_ms: Option<u64>,
    #[serde(default)]
    pub waveform: Option<Waveform>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipList {
    pub jobs: Vec<Clip>,
    pub count: u32,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipUpdate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clip_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clip_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clip_tags: Option<Vec<String>>,
}

// ─── Credentials ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Credential {
    pub provider_id: String,
    pub label: String,
    pub auth_type: String,
    pub status: String,
    pub masked_key: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialList {
    pub credentials: Vec<Credential>,
    pub count: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialTestResult {
    pub success: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

// ─── Keys ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKey {
    pub id: String,
    pub key_prefix: String,
    pub label: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyCreated {
    pub id: String,
    pub key: String,
    pub key_prefix: String,
    pub label: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ApiKeyList {
    pub keys: Vec<ApiKey>,
}

// ─── Usage ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Usage {
    pub total_bytes: u64,
    pub file_count: u32,
    pub quota_bytes: u64,
    pub usage_percent: f64,
    pub remaining_bytes: u64,
}

// ─── Error ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
pub struct ApiErrorBody {
    pub error: String,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub supported: Option<Vec<String>>,
}
