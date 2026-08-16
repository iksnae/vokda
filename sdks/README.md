# Vokda Client SDKs

Client libraries for the [Vokda](https://vokda.iksnae.com) TTS API — voice catalog browsing and synthesis.

| SDK | Location | Dependencies | Notes |
|---|---|---|---|
| TypeScript | `packages/sdk` | — | In the npm workspace; built via `npm run build:sdk` |
| Go | `sdks/go` | **None** — `net/http` + `encoding/json` | Go 1.21+ |
| Python | `sdks/python` | **None** — `urllib` + `json` stdlib only | Python 3.9+ |
| Rust | `sdks/rust` | `reqwest` + `serde`, async via tokio | — |

The three under `sdks/` are outside the npm workspace and are versioned and published independently. All are generated against the same served catalog OpenAPI spec (`/api/v1/openapi.json`).

---

## Language Policy Note — Python

`AGENTS.md` lists Python among avoided technologies and requires that, where an avoided technology appears necessary, a preferred alternative be investigated first and the tradeoffs explained before it is introduced. This note records that explanation.

**The policy governs what Vokda is built in. It does not govern what Vokda publishes for other people to consume.**

A client SDK has exactly one job: to be idiomatic in the language its consumer already writes. That language is chosen by the consumer, not by us. A Go or Rust SDK — both preferred technologies, both present here — cannot serve a Python caller, so no preferred alternative satisfies the requirement. TTS and ML integration work skews heavily Python, which is precisely the audience an SDK exists to reach.

The specific objections `AGENTS.md` raises to Python are development-time, build-time, dependency, environment, and runtime complications, plus fragmented tooling. `sdks/python` is deliberately built to carry none of them:

- **Zero dependencies.** `urllib` and `json` from the standard library. Nothing to resolve, pin, or audit.
- **257 lines total** across `vokda/client.py` and `vokda/__init__.py`.
- **No build step.** No virtualenv, no lockfile, no toolchain to install for contributors.
- **Not on any critical path.** It ships to PyPI; nothing in the app, API, infra, or CI imports it. It cannot break a build or a deploy.

The tradeoff accepted is a small, self-contained maintenance surface in a non-preferred language, in exchange for reach into the ecosystem most likely to consume a TTS API. The mitigation is the constraint above: if this SDK ever grows dependencies or a build step, that tradeoff should be revisited.

The same reasoning covers the Rust and Go SDKs, which need no exception — both are preferred technologies.
