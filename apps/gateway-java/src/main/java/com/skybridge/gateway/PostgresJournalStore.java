package com.skybridge.gateway;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.HexFormat;

final class PostgresJournalStore implements JournalStore {
    private final HikariDataSource pool;

    static PostgresJournalStore fromEnvironment() throws Exception {
        String host = required("PGHOST");
        String database = System.getenv().getOrDefault("PGDATABASE", "messaging");
        String user = required("PGUSER");
        String password = System.getenv("PG_PASSWORD");
        int port = Integer.parseInt(System.getenv().getOrDefault("PGPORT", "5432"));
        return new PostgresJournalStore(new WorkloadIdentityDataSource(host, port, database, user, password));
    }

    PostgresJournalStore(WorkloadIdentityDataSource dataSource) throws Exception {
        HikariConfig config = new HikariConfig();
        config.setDataSource(dataSource);
        config.setMaximumPoolSize(Integer.parseInt(System.getenv().getOrDefault("PG_POOL_SIZE", "10")));
        config.setMinimumIdle(1);
        config.setConnectionTimeout(5_000);
        config.setMaxLifetime(45 * 60 * 1_000L);
        config.setPoolName("gateway-journal");
        pool = new HikariDataSource(config);
        migrate();
    }

    private void migrate() throws Exception {
        try (Connection connection = pool.getConnection(); Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS message_journal (
                      message_id uuid PRIMARY KEY,
                      payload_sha256 char(64) NOT NULL,
                      parser_version text NOT NULL,
                      gateway_region text NOT NULL,
                      acknowledged_at timestamptz NOT NULL DEFAULT now()
                    )
                    """);
        }
    }

    @Override
    public void append(String messageId, String payload, String parserVersion, String region) throws Exception {
        long started = System.nanoTime();
        try (Connection connection = pool.getConnection(); PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO message_journal(message_id, payload_sha256, parser_version, gateway_region)
                VALUES (?::uuid, ?, ?, ?) ON CONFLICT (message_id) DO NOTHING
                """)) {
            statement.setString(1, messageId);
            statement.setString(2, sha256(payload));
            statement.setString(3, parserVersion);
            statement.setString(4, region);
            statement.executeUpdate();
            GatewayMain.JOURNAL_LATENCY.labels(region, "ok")
                    .observe((System.nanoTime() - started) / 1_000_000_000.0);
        } catch (Exception exception) {
            GatewayMain.JOURNAL_LATENCY.labels(region, "error")
                    .observe((System.nanoTime() - started) / 1_000_000_000.0);
            throw exception;
        }
    }

    private static String sha256(String payload) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(payload.getBytes(StandardCharsets.UTF_8)));
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException(name + " is required");
        return value;
    }
}