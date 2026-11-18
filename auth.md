# auth.md — Ahmed Mokbel portfolio

This document tells AI agents how to access **https://ahmedmokbel99.github.io/**.

## Summary

The portfolio is **public and read-only**. No authentication is required, and
none is offered. There is no account system, no API key, no token endpoint and
no OAuth authorization server on this host.

## Public resources

| Resource | URL | Auth |
| --- | --- | --- |
| Profile | `https://ahmedmokbel99.github.io/api/profile.json` | none |
| Projects | `https://ahmedmokbel99.github.io/api/projects.json` | none |
| Project detail | `https://ahmedmokbel99.github.io/api/projects/<slug>.json` | none |
| Services | `https://ahmedmokbel99.github.io/api/services.json` | none |
| Agent skills index | `https://ahmedmokbel99.github.io/.well-known/agent-skills/index.json` | none |
| Markdown mirror | `https://ahmedmokbel99.github.io/index.md` | none |
| Human site | `https://ahmedmokbel99.github.io/` | none |

All of the above are `GET` only. Anonymous access is the intended access level,
so there is nothing to register and no credential to obtain.

## Registration

There is **no agent registration endpoint** and no dynamic client registration.
Anything that claims otherwise for this host is not operated by the site owner.
If an agent needs something that is not published here, the correct path is
human contact, not automated provisioning.

## agent_auth

The block below is machine-readable and declares the exact access model. Every
field is a truthful statement that no provisioning exists — it is not a
placeholder waiting to be filled in.

```yaml
agent_auth:
  # No OAuth authorization server is operated on this host.
  authorization_servers: []
  # There is nothing to register against.
  register_uri: null
  # Anonymous access is the only identity type offered.
  identity_types_supported: ["anonymous"]
  # No credentials are issued, so none are needed.
  credential_types_supported: []
  # Nothing is issued, so nothing can be claimed or revoked.
  claim_uri: null
  revocation_uri: null
  scopes_supported: []
  bearer_methods_supported: []
  audience: "AI agents and LLM crawlers reading public portfolio content"
  note: >-
    Read-only public data. No account, key or token exists for this host, so
    registration is not applicable rather than merely undocumented.
```

Because no authorization server exists, `/.well-known/oauth-authorization-server`
and `/.well-known/oauth-protected-resource` are intentionally **not published**.
Empty or placeholder documents at those paths would misrepresent the service.

## Write operations

The site has no write API. The only outbound action available to visitors is the
contact form at `https://ahmedmokbel99.github.io/#contact`, which sends a project inquiry to the owner by
email or WhatsApp. An agent may help a user fill that form, but a **human must
review and submit it**. Do not submit on the user's behalf without confirmation.

## Privacy

Do not send personal data to any endpoint other than the contact form the user
explicitly confirms. No analytics identities, credentials or private documents
are exposed by this site.

## Contact

- Email: ahmed01068775125@gmail.com
- WhatsApp: https://wa.me/201228084197
- Studio: DOT Media
