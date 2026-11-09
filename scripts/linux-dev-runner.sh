#!/bin/sh
# Cargo clears file capabilities whenever it relinks the executable.
# Only the desktop app needs capture privileges; pass tests and tools through.
set -eu

case "${1-}" in
    */mornye-tools|mornye-tools) ;;
    *) exec "$@" ;;
esac

if [ "$(id -u)" -ne 0 ]; then
    for tool in getcap setcap; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            echo "[linux-dev] Missing $tool; install libcap (libcap2-bin on Debian/Ubuntu)." >&2
            exit 1
        fi
    done

    binary=$1
    info=$(getcap "$binary")
    capabilities=${info#"$binary "}
    capture_ready=false
    for group in $capabilities; do
        names=${group%=*}
        flags=${group#*=}
        case ",$names," in
            *,cap_net_raw,*)
                case "$flags" in
                    *e*p*|*p*e*) capture_ready=true ;;
                esac
                ;;
        esac
    done

    if [ "$capture_ready" = false ]; then
        if ! command -v sudo >/dev/null 2>&1; then
            echo "[linux-dev] sudo is required to grant CAP_NET_RAW to $binary." >&2
            exit 1
        fi
        echo "[linux-dev] Granting CAP_NET_RAW to the rebuilt desktop app (sudo may ask for your password)." >&2
        sudo "$(command -v setcap)" cap_net_raw=ep "$binary"
    fi
fi

exec "$@"
