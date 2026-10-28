FROM oven/bun:1.4.4-alpine

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/app/data/anime.sqlite
WORKDIR /app
RUN mkdir -p /app/data && chown bun:bun /app/data
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun public ./public

USER bun
EXPOSE 3000
ENTRYPOINT ["bun"]
CMD ["src/server.js"]
