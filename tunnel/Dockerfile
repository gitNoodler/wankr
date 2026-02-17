# Run cloudflared as a Railway service for 24/7 tunnel (wankrbot.com → your backend URL).
# Set CLOUDFLARE_TUNNEL_TOKEN in Railway Variables for this service.
FROM cloudflare/cloudflared:latest
ENTRYPOINT ["/bin/sh", "-c", "exec cloudflared tunnel --no-autoupdate run --token \"$CLOUDFLARE_TUNNEL_TOKEN\""]
