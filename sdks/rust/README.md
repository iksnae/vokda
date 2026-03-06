# vokda

Rust SDK for the [Vokda](https://vokda.iksnae.com) TTS API — voice catalog browsing + synthesis.

Uses `reqwest` + `serde`. Async with tokio.

## Install

```toml
[dependencies]
vokda = { git = "https://github.com/iksnae/vokda", path = "sdks/rust" }
tokio = { version = "1", features = ["full"] }
```

## Quick Start

### Browse the Voice Catalog (no auth)

```rust
use vokda::CatalogClient;

#[tokio::main]
async fn main() -> Result<(), vokda::Error> {
    let catalog = CatalogClient::new();

    let data = catalog.list_voices().await?;
    println!("{} voices", data.voices.len());

    let voice = catalog.get_voice("01JCW012A9N9Y3W08F0Q0A1O1").await?;
    println!("{} ({})", voice.name, voice.provider);

    let providers = catalog.list_providers().await?;
    for p in &providers.providers {
        println!("{}: {} voices", p.name, p.voice_count);
    }

    Ok(())
}
```

### Synthesize Speech (authenticated)

```rust
use vokda::{Client, SynthesizeRequest};

#[tokio::main]
async fn main() -> Result<(), vokda::Error> {
    let client = Client::new("vk_live_...");

    // Store credential
    client.save_credential(
        "openai",
        serde_json::json!({"apiKey": "sk-..."}),
        None,
    ).await?;

    // Synthesize
    let clip = client.synthesize(SynthesizeRequest {
        text: "Hello from Vokda!".into(),
        provider: "openai".into(),
        provider_voice_id: Some("alloy".into()),
        ..Default::default()
    }).await?;

    println!("Audio: {}", clip.audio_url.unwrap_or_default());
    println!("Latency: {}ms", clip.latency_ms.unwrap_or(0));

    // Usage
    let usage = client.get_usage().await?;
    println!("{} clips, {:.1}% used", usage.file_count, usage.usage_percent);

    Ok(())
}
```

### Error Handling

```rust
match client.synthesize(req).await {
    Ok(clip) => println!("{}", clip.audio_url.unwrap_or_default()),
    Err(vokda::Error::Api { status, body }) => {
        eprintln!("API error {}: {}", status, body.error);
    }
    Err(e) => eprintln!("Network error: {}", e),
}
```
