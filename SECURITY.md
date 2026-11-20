# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

What the integration handles: the position of the Gladys house (read through the `location`
permission), used only inside the container to pick the nearest station, region and warning
area. It is never sent anywhere: the integration downloads whole public files from
`meteo.arso.gov.si` (HTTPS, no query string, no account, no key), and never writes the position to
the logs. `/data/state.json` keeps only the ids of the warnings already announced to the scenes.
There is no secret to store.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
and ARSO's services.
