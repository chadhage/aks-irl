# Workshop Rehearsal Evidence

Create one directory per rehearsal using `YYYY-MM-DD-run-N`. Copy
`manifest.template.json` to `manifest.json`, record each module result, and
store command output or JSON reports in the referenced relative paths.

A release rehearsal is valid only when:

- Modules M00 through M08 are `PASS`.
- Every module has at least one evidence artifact.
- The run records subscription isolation, participant environment, start/end
  times, estimated cost, and successful cleanup.
- No undocumented trainer intervention is required. Any intervention must be
  recorded and converted into a guide or automation change before release.

Validate a run with:

```bash
python3 tools/evidence/check_evidence.py evidence/2026-01-01-run-1/manifest.json
```
