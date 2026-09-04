# Security policy

## Threat model

This project has an unusually small attack surface, by design:

- It has **no runtime dependencies**, so it inherits no third-party
  vulnerabilities.
- It has **no authentication, no accounts and no sessions**, so there are no
  credentials to leak, steal or bypass.
- It stores **no data**. Every request is answered from immutable, in-process
  data; nothing is written to disk, to a database or to a log sink by the library
  itself.
- It makes **no outbound network calls**.
- Request bodies are capped at 200 000 bytes and analysed text at 20 000
  characters, at both the transport and the handler layer.

The realistic risks are therefore denial of service against a public deployment,
and pathological regular-expression behaviour in the detection rule base.

## Supported versions

The latest released minor version receives security fixes.

## Reporting a vulnerability

Please report suspected vulnerabilities privately using GitHub's "Report a
vulnerability" flow on the repository's Security tab, or by opening an issue that
describes the class of problem without a working exploit. Include:

- the affected endpoint or exported function,
- a minimal reproduction,
- the observed and expected behaviour.

We aim to acknowledge reports within seven days.

## Deployment guidance

The reference implementation applies **no rate limiting**, because it is designed
to be embedded and self-hosted. If you expose it publicly, put it behind a
reverse proxy that enforces rate limits, request-size limits and timeouts
appropriate to your environment.
