FROM node:22-bookworm-slim

ENV CI=true
ENV ALAMATAI_DATA_DIR=/data
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV CURL_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# The slim base image does not guarantee a system CA bundle or curl. Both are
# needed for HTTPS LLM providers and for connectivity checks inside the image.
RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates curl \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/worker

COPY worker/package.json worker/package-lock.json ./
RUN npm ci

COPY worker ./
COPY data /app/data

# Generate a checksum-verified, pinned seed during the image build. The running
# container can therefore initialize D1 without downloading source data again.
RUN npm run db:seed:generate

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p /data \
  && chown node:node /app/worker /data

USER node

VOLUME ["/data"]
EXPOSE 8787

HEALTHCHECK --interval=10s --timeout=3s --start-period=120s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8787/readyz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["serve"]
