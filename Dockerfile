FROM oven/bun:alpine as builder

WORKDIR /app

COPY . .

RUN bun install

RUN bun run build

FROM oven/bun:alpine as result

WORKDIR /app

COPY --from=builder /app/dist .

EXPOSE 4321

CMD ["bun", "run", "start"]