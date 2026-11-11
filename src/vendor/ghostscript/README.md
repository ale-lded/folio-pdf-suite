# Ghostscript WASM

Ghostscript compiled to WebAssembly for the Compress tool. **Do not edit these
files by hand**: they are produced by the build in this repository.

| | |
|---|---|
| Version | see `VERSION` (ghostpdl tag) |
| Built by | `.github/workflows/ghostscript-wasm.yml`, run 43065419964 |
| Recipe | `wasm/ghostscript/compile.sh` (Emscripten 6.0.13) |
| Source | https://github.com/ArtifexSoftware/ghostpdl |
| License | AGPL-3.0 (Artifex Software), like this repository |

## Updating

1. Change the default tag in the workflow, or run it by hand from
   Actions → ghostscript-wasm → Run workflow with the new tag.
2. Download the artifact: `gh run download <run id>`.
3. Replace `gs.mjs`, `gs.wasm` and `VERSION` here, and update the run id above.
