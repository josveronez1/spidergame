FROM node:22-alpine
WORKDIR /app
# dependencies first, so code changes don't reinstall them
COPY lite/server/package.json lite/server/package-lock.json lite/server/
RUN cd lite/server && npm ci --omit=dev
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "lite/server/server.mjs"]
