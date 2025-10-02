# TODO

**Note:** Keep this file lean. Only include current or next actionable tasks.  
- Completed tasks should be removed and logged in `CHANGELOG.md`.  
- Roadmap/visionary ideas belong in `ROADMAP.md`.  

---

**Theming**
- Refactor UI to use Tailwind variables and support multiple themes (light/dark/system)


**Future Enhancement: Debounced/Batch Autosave**

- Replace current immediate autosave with a debounced/batched system
- Implement client-side queue with debounce (e.g. 700ms inactivity or 10+ ops)
- Add new `POST /api/selections/batch` endpoint to accept multiple changes
- Include retry/backoff logic for failed sync attempts
- Show UX indicators: "Queued" vs "Saved"
- Persist queue locally (IndexedDB/localForage) for offline safety
- Goal: reduce API calls, protect quota, and improve UX for heavy use cases
