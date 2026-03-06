//! # vokda
//!
//! Rust SDK for the [Vokda](https://vokda.iksnae.com) TTS API.
//!
//! Two client types:
//! - [`CatalogClient`]: public voice catalog (no auth)
//! - [`Client`]: authenticated synthesis API (wraps CatalogClient)
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use vokda::{CatalogClient, Client};
//!
//! #[tokio::main]
//! async fn main() -> Result<(), vokda::Error> {
//!     // Public catalog
//!     let catalog = CatalogClient::new();
//!     let voices = catalog.list_voices().await?;
//!     println!("{} voices", voices.voices.len());
//!
//!     // Authenticated
//!     let client = Client::new("vk_live_...");
//!     let clip = client.synthesize(vokda::SynthesizeRequest {
//!         text: "Hello!".into(),
//!         provider: "openai".into(),
//!         provider_voice_id: Some("alloy".into()),
//!         ..Default::default()
//!     }).await?;
//!     println!("{}", clip.audio_url.unwrap_or_default());
//!     Ok(())
//! }
//! ```

pub mod types;

pub use types::*;

use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::de::DeserializeOwned;

const DEFAULT_CATALOG_URL: &str = "https://vokda.iksnae.com";
const DEFAULT_SYNTHESIS_URL: &str = "https://api.vokda.iksnae.com";

// ─── Error ───────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("API error {status}: {body:?}")]
    Api {
        status: u16,
        body: ApiErrorBody,
    },
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
}

// ─── CatalogClient ──────────────────────────────────────────────────────────

/// Browse the public voice catalog. No authentication required.
pub struct CatalogClient {
    base_url: String,
    http: reqwest::Client,
}

impl CatalogClient {
    pub fn new() -> Self {
        Self {
            base_url: DEFAULT_CATALOG_URL.into(),
            http: reqwest::Client::new(),
        }
    }

    pub fn with_base_url(mut self, url: &str) -> Self {
        self.base_url = url.trim_end_matches('/').into();
        self
    }

    async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T, Error> {
        let resp = self.http.get(format!("{}{}", self.base_url, path)).send().await?;
        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body: ApiErrorBody = resp.json().await.unwrap_or(ApiErrorBody {
                error: format!("HTTP {status}"),
                message: None,
                supported: None,
            });
            return Err(Error::Api { status, body });
        }
        Ok(resp.json().await?)
    }

    pub async fn list_voices(&self) -> Result<VoiceCatalog, Error> {
        self.get("/api/v1/voices.json").await
    }

    pub async fn get_voice(&self, id: &str) -> Result<Voice, Error> {
        self.get(&format!("/api/v1/voices/{}.json", urlencoding::encode(id))).await
    }

    pub async fn list_providers(&self) -> Result<ProviderList, Error> {
        self.get("/api/v1/providers.json").await
    }

    pub async fn get_stats(&self) -> Result<CatalogStats, Error> {
        self.get("/api/v1/stats.json").await
    }
}

impl Default for CatalogClient {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Client (authenticated) ─────────────────────────────────────────────────

/// Full Vokda API client — catalog + synthesis + clips + credentials + keys.
pub struct Client {
    pub catalog: CatalogClient,
    api_base: String,
    http: reqwest::Client,
}

impl Client {
    pub fn new(api_key: &str) -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {api_key}")).unwrap());
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        Self {
            catalog: CatalogClient::new(),
            api_base: DEFAULT_SYNTHESIS_URL.into(),
            http: reqwest::Client::builder()
                .default_headers(headers)
                .build()
                .unwrap(),
        }
    }

    pub fn with_synthesis_url(mut self, url: &str) -> Self {
        self.api_base = url.trim_end_matches('/').into();
        self
    }

    async fn request<T: DeserializeOwned>(
        &self,
        method: reqwest::Method,
        path: &str,
        body: Option<impl serde::Serialize>,
    ) -> Result<T, Error> {
        let url = format!("{}{}", self.api_base, path);
        let mut req = self.http.request(method, &url);
        if let Some(b) = body {
            req = req.json(&b);
        }
        let resp = req.send().await?;
        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body: ApiErrorBody = resp.json().await.unwrap_or(ApiErrorBody {
                error: format!("HTTP {status}"),
                message: None,
                supported: None,
            });
            return Err(Error::Api { status, body });
        }
        Ok(resp.json().await?)
    }

    async fn request_no_body<T: DeserializeOwned>(
        &self,
        method: reqwest::Method,
        path: &str,
    ) -> Result<T, Error> {
        self.request::<T>(method, path, None::<()>).await
    }

    // ── Synthesis ──

    pub async fn synthesize(&self, req: SynthesizeRequest) -> Result<SynthesizeResponse, Error> {
        self.request(reqwest::Method::POST, "/v1/synthesize", Some(req)).await
    }

    // ── Clips ──

    pub async fn list_clips(&self, limit: u32) -> Result<ClipList, Error> {
        self.request_no_body(reqwest::Method::GET, &format!("/v1/jobs?limit={limit}")).await
    }

    pub async fn get_clip(&self, id: &str) -> Result<Clip, Error> {
        self.request_no_body(reqwest::Method::GET, &format!("/v1/jobs/{id}")).await
    }

    pub async fn update_clip(&self, id: &str, update: ClipUpdate) -> Result<Clip, Error> {
        self.request(reqwest::Method::PATCH, &format!("/v1/jobs/{id}"), Some(update)).await
    }

    pub async fn delete_clip(&self, id: &str) -> Result<serde_json::Value, Error> {
        self.request_no_body(reqwest::Method::DELETE, &format!("/v1/jobs/{id}")).await
    }

    // ── Credentials ──

    pub async fn save_credential(
        &self,
        provider_id: &str,
        credential_data: serde_json::Value,
        label: Option<&str>,
    ) -> Result<serde_json::Value, Error> {
        let mut body = serde_json::json!({
            "providerId": provider_id,
            "credentialData": credential_data,
        });
        if let Some(l) = label {
            body["label"] = serde_json::json!(l);
        }
        self.request(reqwest::Method::POST, "/v1/credentials", Some(body)).await
    }

    pub async fn list_credentials(&self) -> Result<CredentialList, Error> {
        self.request_no_body(reqwest::Method::GET, "/v1/credentials").await
    }

    pub async fn test_credential(
        &self,
        provider_id: &str,
        credential_data: serde_json::Value,
    ) -> Result<CredentialTestResult, Error> {
        let body = serde_json::json!({
            "providerId": provider_id,
            "credentialData": credential_data,
        });
        self.request(reqwest::Method::POST, "/v1/credentials/test", Some(body)).await
    }

    pub async fn delete_credential(&self, provider_id: &str) -> Result<serde_json::Value, Error> {
        self.request_no_body(reqwest::Method::DELETE, &format!("/v1/credentials/{provider_id}")).await
    }

    // ── Keys ──

    pub async fn create_api_key(&self, label: Option<&str>) -> Result<ApiKeyCreated, Error> {
        let body = serde_json::json!({ "label": label.unwrap_or("") });
        self.request(reqwest::Method::POST, "/v1/keys", Some(body)).await
    }

    pub async fn list_api_keys(&self) -> Result<ApiKeyList, Error> {
        self.request_no_body(reqwest::Method::GET, "/v1/keys").await
    }

    pub async fn revoke_api_key(&self, id: &str) -> Result<serde_json::Value, Error> {
        self.request_no_body(reqwest::Method::DELETE, &format!("/v1/keys/{id}")).await
    }

    // ── Usage ──

    pub async fn get_usage(&self) -> Result<Usage, Error> {
        self.request_no_body(reqwest::Method::GET, "/v1/media/usage").await
    }
}

// Default for SynthesizeRequest
impl Default for SynthesizeRequest {
    fn default() -> Self {
        Self {
            text: String::new(),
            provider: String::new(),
            provider_voice_id: None,
            voice_name: None,
            voice_id: None,
            mode: None,
        }
    }
}
