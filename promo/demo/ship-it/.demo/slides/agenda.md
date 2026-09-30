---
theme: default
layout: two-columns
transition: fadeIn
---

# What we'll build

::section::

1. A Node server, no dependencies
2. A route that shortens a link
3. A redirect that follows it back
4. Run it and look at the output

::right::

```http
POST /shorten
{ "url": "https://nodejs.org/en/learn" }

201 Created
{ "short": "/o0f2l2" }
```
