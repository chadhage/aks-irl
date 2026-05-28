FROM gcc:13-bookworm AS build
WORKDIR /src
COPY CMakeLists.txt parser.cpp ./
RUN apt-get update && apt-get install -y --no-install-recommends cmake libpq-dev libmicrohttpd-dev \
    && cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build -j

FROM debian:bookworm-slim AS runtime
ARG APP_VERSION=v1
ENV APP_VERSION=${APP_VERSION}
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 libmicrohttpd12 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -u 1000 -m parser
WORKDIR /app
COPY --from=build /src/build/parser-cpp /app/parser-cpp
USER 1000
EXPOSE 9100 9090
ENTRYPOINT ["/app/parser-cpp"]
