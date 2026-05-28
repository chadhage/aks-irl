FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN apt-get update && apt-get install -y --no-install-recommends maven \
    && mvn -B -q -DskipTests package \
    && cp target/gateway-java-*-fat.jar /tmp/app.jar

# Distroless Java runtime — small, no shell, no package manager.
FROM gcr.io/distroless/java21-debian12 AS runtime
ARG APP_VERSION=v1
ENV APP_VERSION=${APP_VERSION}
WORKDIR /app
COPY --from=build /tmp/app.jar /app/app.jar
USER 1000
# 4561 = TCP socket gateway, 4562 = TLS TCP, 8080 = WebSocket + /metrics + /healthz
EXPOSE 4561 4562 8080
ENTRYPOINT ["java", "-XX:+UseZGC", "-Xms256m", "-Xmx1g", "-jar", "/app/app.jar"]
