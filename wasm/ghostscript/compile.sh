#!/bin/bash
# Compila Ghostscript in WebAssembly con Emscripten.
#
# Pensato per girare dentro il container emscripten/emsdk (vedi
# .github/workflows/ghostscript-wasm.yml), ma funziona ovunque ci siano emcc,
# autoconf e git.
#
# Uso: compile.sh [tag di ghostpdl] [cartella di output]
#
# Basato sugli script di okathira-dev/ghostpdl-wasm (AGPL-3.0).
set -euo pipefail

GS_TAG="${1:-ghostpdl-10.08.0}"
OUT_DIR="$(mkdir -p "${2:-dist}" && cd "${2:-dist}" && pwd)"
WORK_DIR="${WORK_DIR:-$(pwd)/build}"

echo "=== Ghostscript ${GS_TAG} → WebAssembly ==="
emcc --version | head -1

echo "--- 1. Sorgenti"
rm -rf "${WORK_DIR}"
git clone --depth 1 --branch "${GS_TAG}" https://github.com/ArtifexSoftware/ghostpdl.git "${WORK_DIR}"
cd "${WORK_DIR}"

# -Os: ottimizza per dimensione, il file viene scaricato dal browser.
# -flto e le sezioni separate permettono al linker di eliminare il codice
# che non viene mai chiamato.
EM_OPT_FLAGS="-Os -g0 -flto -ffunction-sections -fdata-sections"

# - MODULARIZE + EXPORT_ES6: un modulo ES con una factory, come lo usa il worker.
# - INVOKE_RUN=0: main parte solo quando chiamiamo callMain.
# - ALLOW_MEMORY_GROWTH: i PDF grandi richiedono molta memoria.
# - ENVIRONMENT: web/worker per l'app, node per lo smoke test della CI.
EM_LD_FLAGS="-sFILESYSTEM=1 \
  -sEXPORTED_RUNTIME_METHODS=FS,callMain \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createGhostscript \
  -sINVOKE_RUN=0 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sENVIRONMENT=web,worker,node"

# Solo quello che serve a Compress:
# - niente interpreti PCL, XPS e GPDL (GhostPDL li compila di default);
# - niente OCR (tesseract), che da solo pesa diversi MB;
# - driver: il gruppo PS contiene pdfwrite, l'unico device che usiamo.
GS_CONFIGURE_FLAGS="--disable-contrib --disable-cups --disable-dbus \
  --disable-fontconfig --disable-gtk \
  --without-libpaper --without-libidn --without-pdftoraster --without-ijs \
  --without-x --without-tesseract \
  --without-pcl --without-xps --without-gpdl \
  --with-drivers=PS"

echo "--- 2. Configure"
NOCONFIGURE=1 ./autogen.sh
emconfigure ./configure \
  --host="$(emcc -dumpmachine)" \
  --build="$(./config.guess)" \
  ${GS_CONFIGURE_FLAGS} \
  CFLAGS="${EM_OPT_FLAGS}" \
  CXXFLAGS="${EM_OPT_FLAGS}" \
  LDFLAGS="${EM_OPT_FLAGS} ${EM_LD_FLAGS}"

echo "--- 3. Build"
emmake make -j"$(nproc)" gs

echo "--- 4. Output"
test -f bin/gs && test -f bin/gs.wasm
# Emscripten scrive il JS senza estensione (bin/gs): lo rinominiamo in .mjs
# perché è un modulo ES.
cp bin/gs "${OUT_DIR}/gs.mjs"
cp bin/gs.wasm "${OUT_DIR}/gs.wasm"
echo "${GS_TAG}" > "${OUT_DIR}/VERSION"
ls -la "${OUT_DIR}"

echo "=== Build completata ==="
