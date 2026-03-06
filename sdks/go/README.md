# vokda-go

Go SDK for the [Vokda](https://vokda.iksnae.com) TTS API — voice catalog browsing + synthesis.

**Zero external dependencies** — uses only `net/http` and `encoding/json`. Go 1.21+.

## Install

```bash
go get github.com/iksnae/vokda/sdks/go
```

## Quick Start

### Browse the Voice Catalog (no auth)

```go
package main

import (
    "fmt"
    vokda "github.com/iksnae/vokda/sdks/go"
)

func main() {
    catalog := vokda.NewCatalogClient()

    // List all voices
    data, _ := catalog.ListVoices()
    fmt.Printf("%d voices\n", len(data.Voices))

    // Get a single voice
    voice, _ := catalog.GetVoice("01JCW012A9N9Y3W08F0Q0A1O1")
    fmt.Println(voice.Name, voice.Provider)

    // List providers
    providers, _ := catalog.ListProviders()
    for _, p := range providers.Providers {
        fmt.Printf("%s: %d voices\n", p.Name, p.VoiceCount)
    }
}
```

### Synthesize Speech (authenticated)

```go
client := vokda.NewClient("vk_live_...")

// Store provider credential
client.SaveCredential("openai", map[string]string{"apiKey": "sk-..."}, "")

// Synthesize
clip, err := client.Synthesize(&vokda.SynthesizeRequest{
    Text:            "Hello from Vokda!",
    Provider:        "openai",
    ProviderVoiceID: "alloy",
})
if err != nil {
    var apiErr *vokda.ApiError
    if errors.As(err, &apiErr) {
        fmt.Printf("API error %d: %s\n", apiErr.StatusCode, apiErr.Body.Error)
    }
}
fmt.Println(clip.AudioURL)

// List clips
clips, _ := client.ListClips(50)
fmt.Printf("%d clips\n", clips.Count)

// Usage
usage, _ := client.GetUsage()
fmt.Printf("%d clips, %.1f%% used\n", usage.FileCount, usage.UsagePercent)
```
