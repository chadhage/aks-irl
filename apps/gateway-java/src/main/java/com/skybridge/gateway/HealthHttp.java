package com.skybridge.gateway;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

/**
 * Tiny health endpoint — Kubernetes probes hit this instead of the metrics
 * HTTPServer so we can fail readyz independently of liveness.
 */
final class HealthHttp {
    static void start(int port, String version, String region) throws IOException {
        HttpServer s = HttpServer.create(new InetSocketAddress(port), 0);
        s.createContext("/healthz", ex -> respond(ex, 200,
                "{\"ok\":true,\"version\":\"" + version + "\",\"region\":\"" + region + "\"}"));
        s.createContext("/readyz", ex -> respond(ex, 200,
                "{\"ready\":true,\"active\":" + (long) GatewayMain.ACTIVE_CONNECTIONS
                        .labels(version, region).get() + "}"));
        s.setExecutor(null);
        s.start();
    }
    private static void respond(com.sun.net.httpserver.HttpExchange ex, int code, String body) throws IOException {
        byte[] b = body.getBytes();
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(code, b.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(b); }
    }
}
