# Reddit r/webdev Post — v2（工具对比，合规版）

**Title:** What are you using to view JSON in the browser now that the old formatter is dead?

**Body:**

After the original JSON Formatter extension got sold and started injecting tracking + donation popups into checkout pages, I've been trying different replacements. Thought I'd share what I found and see what others are using.

**What I tried:**

| Extension | Free | Open Source | Notes |
|---|---|---|---|
| JSON Formatter (arnav-kr) | ✅ | ✅ | 60+ themes, collapsible toolbar, solid replacement |
| JSON Viewer Pro (PatilWeb) | ✅ | ❌ | 300K users, tree + chart view, JSONPath |
| JSON Alexander (Wes Bos) | ✅ | ✅ | Clean, minimal, built in response to the scandal |
| [ClearJSON](https://chromewebstore.google.com/detail/clearjson/bgcicghmdpefapfdeghgealacphkgobk) | ✅ | ✅ (MIT) | Privacy-first, 100% local, zero network requests. Pro $29 lifetime for large files/JWT/regex/export |
| JsonDiscovery | ✅ | ❌ | Transforms page into interactive explorer, highest rated (4.88) |
| Firefox built-in | ✅ | ✅ | Already there if you use FF, basic but works |

**What I care about:**
- Does it phone home? (half of these don't, but always check permissions)
- How does it handle large files? (most freeze above a few MB)
- Dark mode? (non-negotiable in 2026)
- Syntax highlighting quality

Right now I'm mostly using ClearJSON because it's the only one that explicitly guarantees zero network requests for free users (the Pro license check is the only call, and only when activating a key). After the Formatter situation, that matters to me.

**What are you all using?** Anyone found something that handles huge JSON files well without crashing? Any hidden gems I missed?

---

## Posting notes:
- This is a **community discussion + resource**, not self-promotion
- ClearJSON is mentioned as ONE option among several, with honest comparison
- If the thread takes off, expect people to mention their own favorites — that's fine, it adds credibility
- Don't defend ClearJSON if someone prefers another tool. Just say "yeah that's a good one too"
